"use client";

import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { prepareSupabaseRealtimeAuth } from "@/lib/supabase/client";

export function useSupabaseRealtimeAuth(supabase: SupabaseClient) {
  const [authReady, setAuthReady] = useState(false);
  const authReadyRef = useRef(false);

  useEffect(() => {
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    async function syncAuth(attempt = 0) {
      const ready = await prepareSupabaseRealtimeAuth(supabase);
      if (!active) return;

      if (ready) {
        authReadyRef.current = true;
        setAuthReady(true);
        return;
      }

      if (attempt < 8) {
        retryTimer = setTimeout(() => {
          void syncAuth(attempt + 1);
        }, 400 * (attempt + 1));
      } else {
        authReadyRef.current = false;
        setAuthReady(false);
      }
    }

    void syncAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      if (session?.access_token) {
        void prepareSupabaseRealtimeAuth(supabase).then((ready) => {
          if (!active) return;
          authReadyRef.current = ready;
          setAuthReady(ready);
        });
      } else {
        authReadyRef.current = false;
        setAuthReady(false);
      }
    });

    return () => {
      active = false;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      subscription.unsubscribe();
    };
  }, [supabase]);

  return authReady;
}
