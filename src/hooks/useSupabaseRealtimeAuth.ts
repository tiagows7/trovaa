"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { prepareSupabaseRealtimeAuth } from "@/lib/supabase/client";

export function useSupabaseRealtimeAuth(supabase: SupabaseClient) {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function syncAuth() {
      const ready = await prepareSupabaseRealtimeAuth(supabase);
      if (active) {
        setAuthReady(ready);
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
      } else {
        setAuthReady(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return authReady;
}
