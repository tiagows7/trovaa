"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadUserProfileRoles, type UserProfileRoles } from "@/lib/admin";

export function useUserProfileRoles(initial?: Partial<UserProfileRoles>) {
  const supabase = useMemo(() => createClient(), []);
  const [roles, setRoles] = useState<UserProfileRoles>({
    isVip: initial?.isVip ?? false,
    isAdmin: initial?.isAdmin ?? false,
  });

  useEffect(() => {
    let active = true;

    async function refreshRoles() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session) {
        setRoles({ isVip: false, isAdmin: false });
        return;
      }

      const next = await loadUserProfileRoles(supabase, session.user.id);
      if (active) {
        setRoles(next);
      }
    }

    void refreshRoles();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshRoles();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return roles;
}
