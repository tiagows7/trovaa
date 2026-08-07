"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { usePlatformPresence } from "@/contexts/PlatformPresenceContext";
import { useStateChannelTracker } from "@/hooks/useStateChannelTracker";
import { createClient } from "@/lib/supabase/client";
import { isProfileVip } from "@/lib/vip";
import type { ProfileGender } from "@/types/database";

export function ConversationLayoutPresence() {
  const pathname = usePathname();
  const { reportLobbyState } = usePlatformPresence();
  const supabase = useMemo(() => createClient(), []);

  const conversationId = useMemo(() => {
    const match = pathname.match(/^\/conversa\/([^/]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  const [userId, setUserId] = useState("");
  const [gender, setGender] = useState<ProfileGender | null>(null);
  const [isVip, setIsVip] = useState(false);
  const [stateCode, setStateCode] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setUserId("");
      setGender(null);
      setIsVip(false);
      setStateCode(null);
      return;
    }

    let active = true;

    async function loadConversationPresence() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) {
        setUserId("");
        setGender(null);
        setIsVip(false);
        setStateCode(null);
        return;
      }

      const [{ data: profile }, { data: conversation }] = await Promise.all([
        supabase
          .from("profiles")
          .select("gender, is_vip, vip_until")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("conversations")
          .select("id, state_code, ended_at, user_a_id, user_b_id")
          .eq("id", conversationId)
          .maybeSingle(),
      ]);

      if (!active) return;

      if (
        !conversation ||
        conversation.ended_at ||
        (conversation.user_a_id !== user.id &&
          conversation.user_b_id !== user.id)
      ) {
        setUserId("");
        setGender(null);
        setIsVip(false);
        setStateCode(null);
        return;
      }

      setUserId(user.id);
      setGender((profile?.gender as ProfileGender | null) ?? null);
      setIsVip(isProfileVip(profile ?? undefined));
      setStateCode(conversation.state_code.toUpperCase());
    }

    void loadConversationPresence();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        if (!session?.user) {
          setUserId("");
          setGender(null);
          setIsVip(false);
          setStateCode(null);
          return;
        }

        void loadConversationPresence();
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [conversationId, supabase]);

  const ownerKey = useMemo(
    () => (conversationId ? `route:${conversationId}` : null),
    [conversationId]
  );

  useStateChannelTracker(
    conversationId && stateCode && userId && gender
      ? {
          stateCode,
          userId,
          gender,
          lookingFor: null,
          inConversation: true,
          isVip,
        }
      : null
  );

  useEffect(() => {
    if (!ownerKey || !stateCode) return;

    reportLobbyState(ownerKey, stateCode);

    return () => {
      reportLobbyState(ownerKey, null);
    };
  }, [ownerKey, reportLobbyState, stateCode]);

  return null;
}
