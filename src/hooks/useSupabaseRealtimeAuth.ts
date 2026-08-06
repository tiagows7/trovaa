"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  prepareSupabaseRealtimeAuth,
  resetSupabaseRealtimeAuthCache,
} from "@/lib/supabase/client";

export function useSupabaseRealtimeAuth(supabase: SupabaseClient) {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    async function syncAuth(attempt = 0) {
      const ready = await prepareSupabaseRealtimeAuth(supabase);
      if (!active) return;

      setAuthReady(ready);

      if (!ready && attempt < 6) {
        retryTimer = setTimeout(() => {
          void syncAuth(attempt + 1);
        }, 500 * (attempt + 1));
      }
    }

    void syncAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      if (session?.access_token) {
        void prepareSupabaseRealtimeAuth(supabase).then((ready) => {
          if (active) setAuthReady(ready);
        });
        return;
      }

      resetSupabaseRealtimeAuthCache();
      setAuthReady(false);
    });

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
      subscription.unsubscribe();
    };
  }, [supabase]);

  return authReady;
}
