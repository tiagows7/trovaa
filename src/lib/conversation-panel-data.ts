import type { SupabaseClient } from "@supabase/supabase-js";
import { getStateByCode } from "@/lib/brazil-states";
import { getDisplayName } from "@/lib/anonymous-names";
import { loadUserProfileRoles, loadUserVipStatus } from "@/lib/admin";
import { fetchSavedUsers, isUserSaved } from "@/lib/saved-users";
import type { ConversationMessage } from "@/types/database";
import type { SavedUserEntry } from "@/lib/saved-users";
import type { ConversationTab } from "@/contexts/ConversationTabsContext";

export type ConversationPanelData = {
  tab: ConversationTab;
  userId: string;
  username: string;
  isVip: boolean;
  isAdmin: boolean;
  partnerIsVip: boolean;
  partnerSaved: boolean;
  initialMessages: ConversationMessage[];
  initialSavedUsers: SavedUserEntry[];
};

export async function loadConversationTabMeta(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  viewerIsVip: boolean
): Promise<ConversationTab | null> {
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, state_code, user_a_id, user_b_id, ended_at")
    .eq("id", conversationId)
    .maybeSingle();

  if (
    !conversation ||
    conversation.ended_at ||
    (conversation.user_a_id !== userId && conversation.user_b_id !== userId)
  ) {
    return null;
  }

  const partnerId =
    conversation.user_a_id === userId
      ? conversation.user_b_id
      : conversation.user_a_id;

  const { data: partnerProfile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", partnerId)
    .maybeSingle();

  const stateInfo = getStateByCode(conversation.state_code);
  if (!stateInfo) return null;

  return {
    conversationId: conversation.id,
    partnerId,
    partnerName: getDisplayName(partnerId, partnerProfile?.username, viewerIsVip),
    stateCode: conversation.state_code,
    stateName: stateInfo.name,
  };
}

export async function loadActiveConversationTabs(
  supabase: SupabaseClient,
  userId: string
): Promise<ConversationTab[]> {
  const roles = await loadUserProfileRoles(supabase, userId);
  if (!roles.isVip) {
    return [];
  }

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .is("ended_at", null)
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

  if (!conversations?.length) {
    return [];
  }

  const tabs = await Promise.all(
    conversations.map((conversation) =>
      loadConversationTabMeta(supabase, conversation.id, userId, true)
    )
  );

  return tabs.filter((tab): tab is ConversationTab => Boolean(tab));
}

export async function loadConversationPanelData(
  supabase: SupabaseClient,
  conversationId: string
): Promise<ConversationPanelData | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const roles = await loadUserProfileRoles(supabase, user.id);
  const tab = await loadConversationTabMeta(
    supabase,
    conversationId,
    user.id,
    roles.isVip
  );

  if (!tab) return null;

  const [{ data: myProfile }, { data: messages }, partnerIsVip, savedUsers, partnerSaved] =
    await Promise.all([
      supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
      supabase
        .from("conversation_messages")
        .select("id, conversation_id, user_id, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200),
      loadUserVipStatus(supabase, tab.partnerId),
      roles.isVip ? fetchSavedUsers(supabase, user.id) : Promise.resolve([]),
      roles.isVip
        ? isUserSaved(supabase, user.id, tab.partnerId)
        : Promise.resolve(false),
    ]);

  return {
    tab,
    userId: user.id,
    username: myProfile?.username ?? user.email ?? "Você",
    isVip: roles.isVip,
    isAdmin: roles.isAdmin,
    partnerIsVip,
    partnerSaved,
    initialMessages: (messages ?? []) as ConversationMessage[],
    initialSavedUsers: savedUsers,
  };
}
