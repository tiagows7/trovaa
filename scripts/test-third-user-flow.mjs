/**
 * Testa em produção: A+B em conversa, C vê presença e pede conexão.
 * Uso: node scripts/test-third-user-flow.mjs
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://trovaa-zeta.vercel.app";
const PASSWORD = "teste123";
const STATE = "SP";
const USERS = {
  ana: "ana@test.trovaa",
  pedro: "pedro@test.trovaa",
  carla: "carla@test.trovaa",
};

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

async function loginApp(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Login ${email}: ${body.error ?? res.status}`);
  }
  const cookies = res.headers.getSetCookie?.() ?? [];
  const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");
  return cookieHeader;
}

async function signInSupabase(url, anonKey, email, password) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(`Supabase login ${email}: ${error.message}`);
  return { client, user: data.user, session: data.session };
}

function trackStatePresence(client, userId, gender, stateCode, label) {
  return new Promise((resolve, reject) => {
    const channel = client.channel(`state:${stateCode}`, {
      config: { presence: { key: userId } },
    });

    channel.on("presence", { event: "sync" }, () => {
      setTimeout(() => {
        const state = channel.presenceState();
        const others = new Set();
        for (const presences of Object.values(state)) {
          for (const p of presences) {
            if (p.user_id && p.user_id !== userId) others.add(p.user_id);
          }
        }
        if (!resolved) {
          resolved = true;
          resolve({ channel, others: [...others], label });
        }
      }, 800);
    });

    let resolved = false;
    let subscribed = false;
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        subscribed = true;
        await channel.track({
          user_id: userId,
          gender,
          looking_for: null,
          state_code: stateCode,
          in_conversation: false,
        });
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        reject(new Error(`${label}: channel ${status}`));
      }
    });

    setTimeout(() => {
      if (!resolved && subscribed) {
        resolved = true;
        const state = channel.presenceState();
        const others = new Set();
        for (const presences of Object.values(state)) {
          for (const p of presences) {
            if (p.user_id && p.user_id !== userId) others.add(p.user_id);
          }
        }
        resolve({ channel, others: [...others], label });
      }
    }, 5000);

    setTimeout(() => {
      if (!resolved) reject(new Error(`${label}: presence sync timeout`));
    }, 20000);
  });
}

async function readPresence(client, userId, gender, stateCode) {
  return new Promise((resolve, reject) => {
    const channel = client.channel(`state:${stateCode}`, {
      config: { presence: { key: userId } },
    });
    let resolved = false;

    const finish = () => {
      if (resolved) return;
      resolved = true;
      const state = channel.presenceState();
      const users = [];
      for (const presences of Object.values(state)) {
        for (const p of presences) {
          if (p.user_id && p.user_id !== userId && p.gender) {
            users.push({
              userId: p.user_id,
              gender: p.gender,
              inConversation: p.in_conversation ?? false,
            });
          }
        }
      }
      resolve({ channel, users });
    };

    channel.on("presence", { event: "sync" }, finish);
    channel.on("presence", { event: "join" }, () => setTimeout(finish, 300));

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          user_id: userId,
          gender,
          looking_for: "masculino",
          state_code: stateCode,
          in_conversation: false,
        });
        setTimeout(finish, 3000);
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        reject(new Error(`Carla: channel ${status}`));
      }
    });

    setTimeout(() => {
      if (!resolved) reject(new Error("read presence timeout"));
    }, 20000);
  });
}

async function requestConnection(cookie, targetId, stateCode) {
  const res = await fetch(`${BASE_URL}/api/connections/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ targetId, stateCode }),
  });
  const body = await res.json();
  return { ok: res.ok, status: res.status, body };
}

async function acceptConnection(cookie, requestId) {
  const res = await fetch(`${BASE_URL}/api/connections/accept`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ requestId }),
  });
  const body = await res.json();
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("=== Setup: encerrar conversas ativas dos test users ===");
  const emails = Object.values(USERS);

  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 200 });
  const byEmail = Object.fromEntries(
    (authData?.users ?? [])
      .filter((u) => emails.includes(u.email ?? ""))
      .map((u) => [u.email, u.id])
  );

  for (const email of emails) {
    if (!byEmail[email]) throw new Error(`Usuário não encontrado: ${email}`);
  }

  const anaId = byEmail[USERS.ana];
  const pedroId = byEmail[USERS.pedro];
  const carlaId = byEmail[USERS.carla];

  const testIds = [anaId, pedroId, carlaId];
  const { data: activeConvs } = await admin
    .from("conversations")
    .select("id")
    .is("ended_at", null)
    .or(
      testIds
        .flatMap((id) => [`user_a_id.eq.${id}`, `user_b_id.eq.${id}`])
        .join(",")
    );

  if (activeConvs?.length) {
    await admin
      .from("conversations")
      .update({ ended_at: new Date().toISOString() })
      .in(
        "id",
        activeConvs.map((c) => c.id)
      );
  }

  const { data: conv, error: convErr } = await admin
    .from("conversations")
    .insert({ state_code: STATE, user_a_id: anaId, user_b_id: pedroId })
    .select("id")
    .single();

  if (convErr) throw new Error(`Criar conversa A+B: ${convErr.message}`);
  console.log(`Conversa A+B criada: ${conv.id} (${STATE})`);

  console.log("\n=== Presença Realtime (state:SP) ===");
  const anaAuth = await signInSupabase(url, anon, USERS.ana, PASSWORD);
  const pedroAuth = await signInSupabase(url, anon, USERS.pedro, PASSWORD);
  const carlaAuth = await signInSupabase(url, anon, USERS.carla, PASSWORD);

  const anaPresence = trackStatePresence(
    anaAuth.client,
    anaId,
    "feminino",
    STATE,
    "Ana"
  );
  const pedroPresence = trackStatePresence(
    pedroAuth.client,
    pedroId,
    "masculino",
    STATE,
    "Pedro"
  );

  await Promise.all([anaPresence, pedroPresence]);
  await sleep(3000);

  const { users: seenByCarla } = await readPresence(
    carlaAuth.client,
    carlaId,
    "feminino",
    STATE
  );

  const seenIds = seenByCarla.map((u) => u.userId).sort();
  const expected = [anaId, pedroId].sort();
  const presenceOk =
    seenIds.length >= 2 &&
    expected.every((id) => seenIds.includes(id));

  console.log(
    presenceOk ? "OK" : "FALHOU",
    `Carla vê ${seenIds.length} usuário(s):`,
    seenIds.map((id) =>
      id === anaId ? "Ana" : id === pedroId ? "Pedro" : id.slice(0, 8)
    )
  );

  console.log("\n=== API de conexão (produção) ===");
  const carlaCookie = await loginApp(USERS.carla, PASSWORD);
  const pedroCookie = await loginApp(USERS.pedro, PASSWORD);

  const req = await requestConnection(carlaCookie, pedroId, STATE);
  console.log("Pedido Carla→Pedro:", req.status, req.body);

  if (!req.ok || req.body.status !== "pending") {
    throw new Error("Falha ao enviar pedido de conexão");
  }

  const accept = await acceptConnection(pedroCookie, req.body.requestId);
  console.log("Aceite Pedro:", accept.status, accept.body);

  if (!accept.ok || !accept.body.conversationId) {
    throw new Error("Falha ao aceitar pedido de conexão");
  }

  const { data: newConv } = await admin
    .from("conversations")
    .select("id, user_a_id, user_b_id, state_code, ended_at")
    .eq("id", accept.body.conversationId)
    .single();

  console.log(
    newConv?.ended_at ? "FALHOU" : "OK",
    "Nova conversa Carla+Pedro:",
    newConv?.id
  );

  // Cleanup pending requests
  await admin
    .from("connection_requests")
    .update({ status: "cancelled", responded_at: new Date().toISOString() })
    .in("requester_id", testIds)
    .eq("status", "pending");

  console.log("\n=== RESUMO ===");
  console.log(`Presença (C vê A+B): ${presenceOk ? "PASSOU" : "FALHOU"}`);
  console.log(
    `Conexão (C pede + B aceita): ${accept.ok ? "PASSOU" : "FALHOU"}`
  );

  if (!presenceOk || !accept.ok) process.exit(1);
}

main().catch((err) => {
  console.error("\nERRO:", err.message);
  process.exit(1);
});
