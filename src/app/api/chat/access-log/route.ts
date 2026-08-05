import { NextResponse } from "next/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getClientIpFromRequest,
  isChatAccessPath,
  type ChatAccessLogPayload,
} from "@/lib/chat-access-log";

function parsePayload(body: unknown): ChatAccessLogPayload | null {
  if (!body || typeof body !== "object") return null;

  const value = body as Record<string, unknown>;
  const path = typeof value.path === "string" ? value.path.trim() : "";
  const userAgent =
    typeof value.userAgent === "string" ? value.userAgent.trim().slice(0, 512) : "";
  const screenResolution =
    typeof value.screenResolution === "string"
      ? value.screenResolution.trim().slice(0, 32)
      : "";
  const timezone =
    typeof value.timezone === "string" ? value.timezone.trim().slice(0, 64) : "";

  if (!path || !isChatAccessPath(path)) return null;
  if (!/^\d+x\d+$/.test(screenResolution)) return null;

  const stateCode =
    typeof value.stateCode === "string" && value.stateCode.trim()
      ? value.stateCode.trim().toUpperCase().slice(0, 2)
      : null;

  const conversationId =
    typeof value.conversationId === "string" &&
    /^[0-9a-f-]{36}$/i.test(value.conversationId)
      ? value.conversationId
      : null;

  return {
    path,
    userAgent,
    screenResolution,
    timezone,
    stateCode,
    conversationId,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClientOrNull();
  if (!admin) {
    return NextResponse.json(
      { error: "Registro de acesso não configurado." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const payload = parsePayload(body);
  if (!payload) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const ipAddress = getClientIpFromRequest(request);

  const { error } = await admin.from("chat_access_logs").insert({
    user_id: user.id,
    ip_address: ipAddress,
    user_agent: payload.userAgent || null,
    screen_resolution: payload.screenResolution,
    timezone: payload.timezone || null,
    path: payload.path,
    state_code: payload.stateCode,
    conversation_id: payload.conversationId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await admin.rpc("purge_chat_access_logs_older_than_six_months");
  } catch {
    // A purga é best-effort; o registro principal já foi salvo.
  }

  return NextResponse.json({ recorded: true });
}
