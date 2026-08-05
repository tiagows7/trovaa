import type { SupabaseClient } from "@supabase/supabase-js";
import { formatConversationError } from "@/lib/conversations";

export type ConnectionRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled";

export type ConnectionRequest = {
  id: string;
  requesterId: string;
  targetId: string;
  stateCode: string;
  status: ConnectionRequestStatus;
  conversationId: string | null;
  createdAt: string;
  respondedAt: string | null;
};

export type RequestConnectionResult =
  | { status: "existing"; conversationId: string }
  | { status: "pending"; requestId: string };

type ConnectionRequestRow = {
  id: string;
  requester_id: string;
  target_id: string;
  state_code: string;
  status: ConnectionRequestStatus;
  conversation_id: string | null;
  created_at: string;
  responded_at: string | null;
};

export function mapConnectionRequest(row: ConnectionRequestRow): ConnectionRequest {
  return {
    id: row.id,
    requesterId: row.requester_id,
    targetId: row.target_id,
    stateCode: row.state_code,
    status: row.status,
    conversationId: row.conversation_id,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  };
}

export function formatConnectionRequestError(message: string) {
  return formatConversationError(message);
}

export async function fetchPendingIncomingRequest(
  supabase: SupabaseClient,
  userId: string
): Promise<ConnectionRequest | null> {
  const { data } = await supabase
    .from("connection_requests")
    .select(
      "id, requester_id, target_id, state_code, status, conversation_id, created_at, responded_at"
    )
    .eq("target_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? mapConnectionRequest(data as ConnectionRequestRow) : null;
}

export async function fetchPendingOutgoingRequest(
  supabase: SupabaseClient,
  userId: string
): Promise<ConnectionRequest | null> {
  const { data } = await supabase
    .from("connection_requests")
    .select(
      "id, requester_id, target_id, state_code, status, conversation_id, created_at, responded_at"
    )
    .eq("requester_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? mapConnectionRequest(data as ConnectionRequestRow) : null;
}

export async function requestConnection(
  supabase: SupabaseClient,
  targetId: string,
  stateCode: string
): Promise<RequestConnectionResult> {
  const { data, error } = await supabase.rpc("request_connection", {
    p_target_id: targetId,
    p_state_code: stateCode,
  });

  if (error) {
    throw new Error(formatConnectionRequestError(error.message));
  }

  const payload = data as {
    status: "existing" | "pending";
    conversation_id?: string;
    request_id?: string;
  };

  if (payload.status === "existing" && payload.conversation_id) {
    return { status: "existing", conversationId: payload.conversation_id };
  }

  if (payload.status === "pending" && payload.request_id) {
    return { status: "pending", requestId: payload.request_id };
  }

  throw new Error("Resposta inválida ao pedir conexão.");
}

export async function acceptConnection(
  supabase: SupabaseClient,
  requestId: string
): Promise<string> {
  const { data, error } = await supabase.rpc("accept_connection", {
    p_request_id: requestId,
  });

  if (error) {
    throw new Error(formatConnectionRequestError(error.message));
  }

  return data as string;
}

export async function declineConnection(
  supabase: SupabaseClient,
  requestId: string
) {
  const { error } = await supabase.rpc("decline_connection", {
    p_request_id: requestId,
  });

  if (error) {
    throw new Error(formatConnectionRequestError(error.message));
  }
}

export async function cancelConnectionRequest(
  supabase: SupabaseClient,
  requestId: string
) {
  const { error } = await supabase.rpc("cancel_connection_request", {
    p_request_id: requestId,
  });

  if (error) {
    throw new Error(formatConnectionRequestError(error.message));
  }
}
