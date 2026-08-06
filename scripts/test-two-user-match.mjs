/**
 * Simula Pedro (homem) + Ana (mulher) com filtros compatíveis em state:SP.
 * Uso: node scripts/test-two-user-match.mjs
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const PASSWORD = "teste123";
const STATE = "SP";

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
          lookingFor: p.looking_for ?? null,
        });
      }
    }
  }

  const byId = new Map();
  for (const u of users) byId.set(u.userId, u);
  return [...byId.values()];
}

function genderPairMatches(sought, profileGender) {
  if (sought === "outro" || profileGender === "outro") return true;
  return sought === profileGender;
}

function isMutualMatch(viewerGender, preferredGender, candidate, viewerLookingFor) {
  if (candidate.gender !== preferredGender) return false;

  const candidateSeeksViewer =
    candidate.lookingFor === null ||
    candidate.lookingFor === undefined ||
    genderPairMatches(candidate.lookingFor, viewerGender);

  if (!candidateSeeksViewer) return false;

  if (viewerLookingFor === null || viewerLookingFor === undefined) return true;
  return genderPairMatches(viewerLookingFor, candidate.gender);
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

  const token = data.session?.access_token;
  if (token) {
    await client.realtime.setAuth(token);
  }

  return { client, userId: data.user.id };
}

async function connectMatchPresence(client, userId, gender, lookingFor, label) {
  return new Promise((resolve, reject) => {
    const channel = client.channel(`state:${STATE}`, {
      config: { presence: { key: userId } },
    });

    let settled = false;

    channel.on("presence", { event: "sync" }, () => {
      if (!settled) {
        settled = true;
        resolve({ channel, label, userId, gender, lookingFor });
      }
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          await channel.track({
            user_id: userId,
            gender,
            looking_for: lookingFor,
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
      if (!settled) {
        settled = true;
        resolve({ channel, label, userId, gender, lookingFor });
      }
    }, 10000);
  });
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log("=== Teste: Pedro (M→F) + Ana (F→M) em state:SP ===\n");

  const pedro = await signIn(url, anon, "pedro@test.trovaa");
  const ana = await signIn(url, anon, "ana@test.trovaa");

  console.log("Conectando Pedro (masculino, busca feminino)...");
  const pedroSession = await connectMatchPresence(
    pedro.client,
    pedro.userId,
    "masculino",
    "feminino",
    "Pedro"
  );
  console.log("  ✓ Pedro online");

  await sleep(1500);

  console.log("Conectando Ana (feminino, busca masculino)...");
  const anaSession = await connectMatchPresence(
    ana.client,
    ana.userId,
    "feminino",
    "masculino",
    "Ana"
  );
  console.log("  ✓ Ana online");

  await sleep(3000);

  const pedroOthers = readOthers(pedroSession.channel, pedro.userId);
  const anaOthers = readOthers(anaSession.channel, ana.userId);

  console.log(`\nPedro vê ${pedroOthers.length} online:`, pedroOthers);
  console.log(`Ana vê ${anaOthers.length} online:`, anaOthers);

  const pedroSeesAna = pedroOthers.some((u) => u.userId === ana.userId);
  const anaSeesPedro = anaOthers.some((u) => u.userId === pedro.userId);

  const pedroMatch = pedroOthers.find((u) => u.userId === ana.userId);
  const anaMatch = anaOthers.find((u) => u.userId === pedro.userId);

  const pedroMutual =
    pedroMatch &&
    isMutualMatch("masculino", "feminino", pedroMatch, "feminino");
  const anaMutual =
    anaMatch && isMutualMatch("feminino", "masculino", anaMatch, "masculino");

  console.log("\nResultado:");
  console.log(`  Pedro vê Ana: ${pedroSeesAna ? "SIM" : "NÃO"}`);
  console.log(`  Ana vê Pedro: ${anaSeesPedro ? "SIM" : "NÃO"}`);
  console.log(`  Match mútuo Pedro: ${pedroMutual ? "SIM" : "NÃO"}`);
  console.log(`  Match mútuo Ana: ${anaMutual ? "SIM" : "NÃO"}`);

  await pedroSession.channel.untrack().catch(() => undefined);
  await anaSession.channel.untrack().catch(() => undefined);
  pedro.client.removeChannel(pedroSession.channel);
  ana.client.removeChannel(anaSession.channel);

  if (!pedroSeesAna || !anaSeesPedro || !pedroMutual || !anaMutual) {
    process.exit(1);
  }

  console.log("\n✓ Teste passou.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
