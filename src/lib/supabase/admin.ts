import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function buildAdminClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getAdminClientOrNull(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return buildAdminClient(url, serviceRoleKey);
}

export function createAdminClient() {
  const client = getAdminClientOrNull();

  if (!client) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  }

  return client;
}
