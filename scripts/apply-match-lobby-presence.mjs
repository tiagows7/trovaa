/**
 * Verifica se match_queue está disponível para presença na sala.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim().replace(/^"|"$/g, "");
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const admin = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await admin.from("match_queue").select("user_id").limit(1);
  if (error) {
    console.error("match_queue indisponível:", error.message);
    process.exit(1);
  }

  console.log("OK: match_queue pronta para presença na sala.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
