import type { SupabaseClient } from "@supabase/supabase-js";

type ConversationRouter = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

export const NON_VIP_SINGLE_CHAT_MESSAGE =
  "Sem VIP você só pode conversar com uma pessoa por vez. Assine o VIP para abrir várias conversas em abas no app.";

export function isNonVipConversationLimitError(message: string) {
  return (
    message.includes("NON_VIP_SINGLE_CHAT_LIMIT") ||
    message.includes("só podem manter uma conversa ativa")
  );
}

export function formatConversationError(message: string) {
  if (isNonVipConversationLimitError(message)) {
    return NON_VIP_SINGLE_CHAT_MESSAGE;
  }

  return message;
}

export type ActiveConversation = {
  id: string;
  partnerId: string;
};

export async function fetchActiveConversations(
  supabase: SupabaseClient,
  userId: string
): Promise<ActiveConversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, user_a_id, user_b_id")
    .is("ended_at", null)
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

  if (error || !data?.length) {
    return [];
  }

  return data.map((conversation) => ({
    id: conversation.id,
    partnerId:
      conversation.user_a_id === userId
        ? conversation.user_b_id
        : conversation.user_a_id,
  }));
}

export async function fetchPrimaryActiveConversationId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const active = await fetchActiveConversations(supabase, userId);
  return active[0]?.id ?? null;
}

export async function canStartConversationWith(
  supabase: SupabaseClient,
  userId: string,
  partnerId: string,
  isVip: boolean
): Promise<{ allowed: boolean; existingConversationId?: string }> {
  if (isVip) {
    return { allowed: true };
  }

  const active = await fetchActiveConversations(supabase, userId);

  if (active.length === 0) {
    return { allowed: true };
  }

  const withSamePartner = active.find(
    (conversation) => conversation.partnerId === partnerId
  );

  if (withSamePartner) {
    return { allowed: true, existingConversationId: withSamePartner.id };
  }

  return { allowed: false, existingConversationId: active[0]?.id };
}

export function navigateToConversation(
  conversationId: string,
  router: ConversationRouter
) {
  router.replace(`/conversa/${conversationId}`);
}

export async function endConversation(
  supabase: SupabaseClient,
  conversationId: string
) {
  await supabase.rpc("end_conversation", {
    p_conversation_id: conversationId,
  });
}

export async function endAllActiveConversations(supabase: SupabaseClient) {
  await supabase.rpc("end_my_active_conversations");
}
