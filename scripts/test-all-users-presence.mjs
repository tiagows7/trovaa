/**
 * Conecta todos os usuários de teste em state:SP e verifica presença mútua.
 * Uso: node scripts/test-all-users-presence.mjs
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const PASSWORD = "teste123";
const STATE = "SP";
const SYNC_TIMEOUT_MS = 20000;
const EXPECTED_OTHERS = 7; // 8 usuários - 1 (self)

const TEST_USERS = [
  { email: "marina.vip@test.trovaa", label: "Marina", gender: "feminino", isVip: true },
  { email: "lucas.vip@test.trovaa", label: "Lucas", gender: "masculino", isVip: true },
  { email: "beatriz.vip@test.trovaa", label: "Beatriz", gender: "feminino", isVip: true },
  { email: "ana@test.trovaa", label: "Ana", gender: "feminino", isVip: false },
  { email: "pedro@test.trovaa", label: "Pedro", gender: "masculino", isVip: false },
  { email: "carla@test.trovaa", label: "Carla", gender: "feminino", isVip: false },
  { email: "rafael@test.trovaa", label: "Rafael", gender: "masculino", isVip: false },
  { email: "julia@test.trovaa", label: "Júlia", gender: "feminino", isVip: false },
];

function loadEnv() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
  }
  return env;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function readOthers(channel, selfId) {
  const state = channel.presenceState();
  const users = [];

  for (const presences of Object.values(state)) {
    for (const p of presences) {
      if (p.user_id && p.user_id !== selfId && p.gender) {
        users.push({
          userId: p.user_id,
          gender: p.gender,
          inConversation: p.in_conversation ?? false,
        });
      }
    }
  }

  const byId = new Map();
  for (const u of users) byId.set(u.userId, u);
  return [...byId.values()];
}

function countByGender(users) {
  return users.reduce(
    (acc, u) => {
      acc[u.gender] = (acc[u.gender] ?? 0) + 1;
      return acc;
    },
    { feminino: 0, masculino: 0, outro: 0 }
  );
}

async function signIn(url, anonKey, email) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) throw new Error(`Login ${email}: ${error.message}`);
  return { client, userId: data.user.id };
}

function connectPresence(client, userId, gender, label) {
  return new Promise((resolve, reject) => {
    const channel = client.channel(`state:${STATE}`, {
      config: { presence: { key: userId } },
    });

    let settled = false;

    const settleOk = () => {
      if (settled) return;
      settled = true;
      resolve({ channel, label, userId, gender, client });
    };

    channel.on("presence", { event: "sync" }, () => {
      setTimeout(settleOk, 400);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          await channel.track({
            user_id: userId,
            gender,
            looking_for: null,
            state_code: STATE,
            in_conversation: false,
          });
        } catch (err) {
          if (!settled) {
            settled = true;
            reject(err);
          }
        }
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        if (!settled) {
          settled = true;
          reject(new Error(`${label}: ${status}`));
        }
      }
    });

    setTimeout(() => {
      if (!settled) settleOk();
    }, 8000);
  });
}

async function waitForStableCounts(sessions, expectedOthers) {
  const started = Date.now();
  let lastSnapshot = "";

  while (Date.now() - started < SYNC_TIMEOUT_MS) {
    const rows = sessions.map((s) => {
      const others = readOthers(s.channel, s.userId);
      return { label: s.label, count: others.length, others };
    });

    const snapshot = rows.map((r) => `${r.label}:${r.count}`).join("|");
    const allReady = rows.every((r) => r.count >= expectedOthers);

    if (allReady) {
      return { rows, elapsed: Date.now() - started };
    }

    lastSnapshot = snapshot;
    await sleep(1000);
  }

  const rows = sessions.map((s) => ({
    label: s.label,
    count: readOthers(s.channel, s.userId).length,
    others: readOthers(s.channel, s.userId),
  }));

  return { rows, elapsed: Date.now() - started, timeout: true, lastSnapshot };
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`=== Teste: ${TEST_USERS.length} usuários em state:${STATE} ===\n`);

  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 200 });
  const idByEmail = new Map(
    (authData?.users ?? [])
      .filter((u) => TEST_USERS.some((t) => t.email === u.email))
      .map((u) => [u.email, u.id])
  );

  const missing = TEST_USERS.filter((u) => !idByEmail.has(u.email));
  if (missing.length) {
    throw new Error(
      `Usuários não encontrados: ${missing.map((u) => u.email).join(", ")}`
    );
  }

  const idToLabel = new Map(
    TEST_USERS.map((u) => [idByEmail.get(u.email), u.label])
  );

  console.log("Conectando usuários (Realtime)...");
  const sessions = [];

  // Conecta em lotes para não saturar o Realtime
  for (let i = 0; i < TEST_USERS.length; i += 2) {
    const batch = TEST_USERS.slice(i, i + 2);
    const connected = await Promise.all(
      batch.map(async (user) => {
        const { client, userId } = await signIn(url, anon, user.email);
        const session = await connectPresence(client, userId, user.gender, user.label);
        process.stdout.write(`  ✓ ${user.label} online\n`);
        return { ...session, email: user.email, isVip: user.isVip };
      })
    );
    sessions.push(...connected);
    await sleep(800);
  }

  console.log("\nAguardando sincronização de presença...");
  const { rows, elapsed, timeout } = await waitForStableCounts(
    sessions,
    EXPECTED_OTHERS
  );

  console.log(`\nResultado após ${(elapsed / 1000).toFixed(1)}s:\n`);
  console.log("Usuário       | Vê online | Feminino | Masculino | Nomes");
  console.log("--------------+-----------+----------+-----------+---------------------------");

  let allPassed = true;
  const minSeen = Math.min(...rows.map((r) => r.count));
  const maxSeen = Math.max(...rows.map((r) => r.count));

  for (const row of rows) {
    const session = sessions.find((s) => s.label === row.label);
    const genders = countByGender(row.others);
    const names = row.others
      .map((o) => idToLabel.get(o.userId) ?? o.userId.slice(0, 6))
      .sort()
      .join(", ");
    const ok = row.count >= EXPECTED_OTHERS;
    if (!ok) allPassed = false;

    console.log(
      `${row.label.padEnd(13)} | ${String(row.count).padStart(9)} | ${String(genders.feminino).padStart(8)} | ${String(genders.masculino).padStart(9)} | ${ok ? "OK" : "FALHOU"} ${names}`
    );
  }

  console.log("\n=== Cenário misto: 2 em conversa + 6 no lobby ===");
  await Promise.all(
    sessions.map((s) => s.channel.untrack().catch(() => undefined))
  );
  await sleep(500);

  // Ana + Pedro simulam conversa (openToMatch como no app)
  const ana = sessions.find((s) => s.label === "Ana");
  const pedro = sessions.find((s) => s.label === "Pedro");

  await ana.channel.track({
    user_id: ana.userId,
    gender: ana.gender,
    looking_for: null,
    state_code: STATE,
    in_conversation: false,
  });
  await pedro.channel.track({
    user_id: pedro.userId,
    gender: pedro.gender,
    looking_for: null,
    state_code: STATE,
    in_conversation: false,
  });

  for (const s of sessions) {
    if (s.label === "Ana" || s.label === "Pedro") continue;
    await s.channel.track({
      user_id: s.userId,
      gender: s.gender,
      looking_for: null,
      state_code: STATE,
      in_conversation: false,
    });
  }

  await sleep(4000);

  const julia = sessions.find((s) => s.label === "Júlia");
  const juliaOthers = readOthers(julia.channel, julia.userId);
  const juliaNames = juliaOthers
    .map((o) => idToLabel.get(o.userId))
    .filter(Boolean)
    .sort();

  const mixedOk =
    juliaOthers.length >= EXPECTED_OTHERS &&
    juliaNames.includes("Ana") &&
    juliaNames.includes("Pedro");

  console.log(
    mixedOk ? "OK" : "FALHOU",
    `Júlia vê ${juliaOthers.length}/7:`,
    juliaNames.join(", ")
  );

  console.log("\n=== RESUMO ===");
  console.log(`Todos conectados (${TEST_USERS.length}): ${allPassed && !timeout ? "PASSOU" : "FALHOU"}`);
  console.log(`Contagem mín/máx entre usuários: ${minSeen}/${maxSeen} (esperado ${EXPECTED_OTHERS})`);
  console.log(`Cenário misto (Júlia vê Ana+Pedro em conversa): ${mixedOk ? "PASSOU" : "FALHOU"}`);

  for (const s of sessions) {
    await s.channel.untrack().catch(() => undefined);
    await s.client.removeChannel(s.channel).catch(() => undefined);
  }

  if (!allPassed || timeout || !mixedOk) {
    if (timeout) console.log("\nTimeout: nem todos viram 7 usuários a tempo.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\nERRO:", err.message);
  process.exit(1);
});
