/**
 * Simula A+B em conversa (in_conversation: true) e C lendo presença.
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

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

async function signIn(url, anon, email) {
  const client = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) throw error;
  return { client, userId: data.user.id };
}

function trackPresence(client, userId, gender, inConversation, isVip) {
  return new Promise((resolve, reject) => {
    const channel = client.channel(`state:${STATE}`, {
      config: { presence: { key: userId } },
    });
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      const state = channel.presenceState();
      const users = [];
      for (const presences of Object.values(state)) {
        for (const p of presences) {
          if (p.user_id && p.user_id !== userId && p.gender) {
            users.push({
              userId: p.user_id,
              gender: p.gender,
              inConversation: p.in_conversation ?? false,
              isVip: p.is_vip ?? false,
            });
          }
        }
      }
      resolve({ channel, users });
    };

    channel.on("presence", { event: "sync" }, () => setTimeout(finish, 800));
    channel.on("presence", { event: "join" }, () => setTimeout(finish, 500));

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          user_id: userId,
          gender,
          looking_for: null,
          state_code: STATE,
          in_conversation: inConversation,
          is_vip: isVip,
        });
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        reject(new Error(`${userId}: ${status}`));
      }
    });

    setTimeout(() => {
      if (!done) finish();
    }, 5000);
    setTimeout(() => {
      if (!done) reject(new Error("timeout"));
    }, 15000);
  });
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const ana = await signIn(url, anon, USERS.ana);
  const pedro = await signIn(url, anon, USERS.pedro);
  const carla = await signIn(url, anon, USERS.carla);

  console.log("Tracking Ana+Pedro in conversation (in_conversation: true)...");
  await Promise.all([
    trackPresence(ana.client, ana.userId, "feminino", true, false),
    trackPresence(pedro.client, pedro.userId, "masculino", true, false),
  ]);
  await sleep(2000);

  console.log("Carla reads presence...");
  const { users } = await trackPresence(
    carla.client,
    carla.userId,
    "feminino",
    false,
    false
  );

  console.log(`Carla sees ${users.length} user(s):`, users);
  const ids = users.map((u) => u.userId).sort();
  const expected = [ana.userId, pedro.userId].sort();
  const ok =
    users.length >= 2 && expected.every((id) => ids.includes(id));

  if (!ok) process.exit(1);
  console.log("PASS");
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
