import type { SupabaseClient } from "@supabase/supabase-js";
import { loadUserVipStatus } from "@/lib/admin";

function normalizeStateCode(stateCode: string) {
  const normalized = stateCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw new Error("Invalid state code");
  }
  return normalized;
}

async function findActiveConversationId(
  admin: SupabaseClient,
  userAId: string,
  userBId: string
) {
  const { data } = await admin
    .from("conversations")
    .select("id")
    .is("ended_at", null)
    .or(
      `and(user_a_id.eq.${userAId},user_b_id.eq.${userBId}),and(user_a_id.eq.${userBId},user_b_id.eq.${userAId})`
    )
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

async function userHasActiveConversation(
  admin: SupabaseClient,
  userId: string
) {
  const { data } = await admin
    .from("conversations")
    .select("id")
    .is("ended_at", null)
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .limit(1)
    .maybeSingle();

  return Boolean(data?.id);
}

export async function requestConnectionWithAdmin(
  admin: SupabaseClient,
  requesterId: string,
  targetId: string,
  stateCode: string
) {
  if (requesterId === targetId) {
    throw new Error("Cannot connect with yourself");
  }

  const normalizedState = normalizeStateCode(stateCode);

  const existingConversationId = await findActiveConversationId(
    admin,
    requesterId,
    targetId
  );

  if (existingConversationId) {
    return {
      status: "existing" as const,
      conversationId: existingConversationId,
    };
  }

  const [requesterIsVip, targetIsVip] = await Promise.all([
    loadUserVipStatus(admin, requesterId),
    loadUserVipStatus(admin, targetId),
  ]);

  if (!requesterIsVip && (await userHasActiveConversation(admin, requesterId))) {
    throw new Error("NON_VIP_SINGLE_CHAT_LIMIT");
  }

  if (!targetIsVip && (await userHasActiveConversation(admin, targetId))) {
    throw new Error("NON_VIP_TARGET_BUSY");
  }

  await admin
    .from("connection_requests")
    .update({
      status: "cancelled",
      responded_at: new Date().toISOString(),
    })
    .eq("requester_id", requesterId)
    .eq("status", "pending");

  await admin
    .from("connection_requests")
    .update({
      status: "cancelled",
      responded_at: new Date().toISOString(),
    })
    .eq("requester_id", requesterId)
    .eq("target_id", targetId)
    .eq("status", "pending");

  const { data, error } = await admin
    .from("connection_requests")
    .insert({
      requester_id: requesterId,
      target_id: targetId,
      state_code: normalizedState,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Não foi possível enviar o pedido de conexão.");
  }

  return {
    status: "pending" as const,
    requestId: data.id as string,
  };
}

export async function acceptConnectionWithAdmin(
  admin: SupabaseClient,
  targetUserId: string,
  requestId: string
) {
  const { data: request, error: requestError } = await admin
    .from("connection_requests")
    .select(
      "id, requester_id, target_id, state_code, status, conversation_id"
    )
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !request) {
    throw new Error("Invalid connection request");
  }

  if (request.target_id !== targetUserId) {
    throw new Error("Invalid connection request");
  }

  if (request.status !== "pending") {
    throw new Error("Connection request is no longer pending");
  }

  let conversationId = request.conversation_id;

  if (!conversationId) {
    conversationId = await findActiveConversationId(
      admin,
      request.requester_id,
      request.target_id
    );
  }

  if (!conversationId) {
    const { data: created, error: createError } = await admin
      .from("conversations")
      .insert({
        state_code: request.state_code,
        user_a_id: request.requester_id,
        user_b_id: request.target_id,
      })
      .select("id")
      .single();

    if (createError || !created) {
      throw new Error(createError?.message ?? "Não foi possível abrir a conversa.");
    }

    conversationId = created.id as string;

    await admin
      .from("match_queue")
      .delete()
      .in("user_id", [request.requester_id, request.target_id]);

    await admin.rpc("save_vip_contact", {
      p_user_id: request.requester_id,
      p_partner_id: request.target_id,
      p_state_code: request.state_code,
    });
    await admin.rpc("save_vip_contact", {
      p_user_id: request.target_id,
      p_partner_id: request.requester_id,
      p_state_code: request.state_code,
    });
  }

  const { error: updateError } = await admin
    .from("connection_requests")
    .update({
      status: "accepted",
      conversation_id: conversationId,
      responded_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return conversationId as string;
}
