/**
 * Testa presença na sala via match_queue (Pedro + Ana em SP).
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const PASSWORD = "teste123";
const STATE = "SP";

function loadEnv() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim().replace(/^"|"$/g, "");
  }
  return env;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  return { userId: data.user.id };
}

async function main() {
  const env = loadEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const pedro = await signIn(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "pedro@test.trovaa");
  const ana = await signIn(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "ana@test.trovaa");

  const now = new Date().toISOString();

  await admin.from("match_queue").upsert([
    {
      user_id: pedro.userId,
      state_code: STATE,
      preferred_gender: "feminino",
      created_at: now,
    },
    {
      user_id: ana.userId,
      state_code: STATE,
      preferred_gender: "masculino",
      created_at: now,
    },
  ]);

  await sleep(300);

  const { data, error } = await admin
    .from("match_queue")
    .select("user_id, preferred_gender")
    .eq("state_code", STATE);

  if (error) throw error;

  console.log("Na sala:", data);
  const ids = (data ?? []).map((row) => row.user_id).sort();
  const expected = [pedro.userId, ana.userId].sort();
  if (ids.length !== 2 || !expected.every((id) => ids.includes(id))) {
    process.exit(1);
  }

  console.log("PASS");
}

main().catch((error) => {
  console.error("FAIL:", error.message);
  process.exit(1);
});
