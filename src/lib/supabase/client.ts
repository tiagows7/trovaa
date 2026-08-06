import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"
  );

  return browserClient;
}

export async function prepareSupabaseRealtimeAuth(client: SupabaseClient) {
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.access_token) {
    return false;
  }

  await client.realtime.setAuth(session.access_token);
  return true;
}
