"use client";

import { useEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export function useSupabaseRealtimeAuth(supabase: SupabaseClient) {
  useEffect(() => {
    let active = true;

    async function syncRealtimeAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active || !session?.access_token) return;

      await supabase.realtime.setAuth(session.access_token);
    }

    void syncRealtimeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        void supabase.realtime.setAuth(session.access_token);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);
}
