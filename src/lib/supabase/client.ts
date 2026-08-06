import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;
let cachedAccessToken: string | undefined;
let authSyncPromise: Promise<boolean> | undefined;

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

export function resetSupabaseRealtimeAuthCache() {
  cachedAccessToken = undefined;
  authSyncPromise = undefined;
}

export async function prepareSupabaseRealtimeAuth(client: SupabaseClient) {
  const {
    data: { session },
  } = await client.auth.getSession();

  const accessToken = session?.access_token;
  if (accessToken) {
    if (cachedAccessToken === accessToken) {
      return true;
    }

    await client.realtime.setAuth(accessToken);
    cachedAccessToken = accessToken;
    return true;
  }

  if (!authSyncPromise) {
    authSyncPromise = (async () => {
      const {
        data: { user },
      } = await client.auth.getUser();

      if (!user) {
        return false;
      }

      const refreshed = await client.auth.refreshSession();
      const refreshedToken = refreshed.data.session?.access_token;

      if (!refreshedToken) {
        return false;
      }

      await client.realtime.setAuth(refreshedToken);
      cachedAccessToken = refreshedToken;
      return true;
    })().finally(() => {
      authSyncPromise = undefined;
    });
  }

  return authSyncPromise;
}
