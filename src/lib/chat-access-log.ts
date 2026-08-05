const CHAT_ROUTE_PREFIXES = ["/salas", "/chat", "/conversa"] as const;

export type ChatAccessLogPayload = {
  path: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  stateCode?: string | null;
  conversationId?: string | null;
};

export function isChatAccessPath(pathname: string) {
  return CHAT_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function getChatAccessSessionKey(pathname: string) {
  return `trovaa-chat-access:${pathname}`;
}

export function parseChatAccessPath(pathname: string) {
  const stateMatch = pathname.match(/^\/chat\/([A-Za-z]{2})/);
  const conversationMatch = pathname.match(/^\/conversa\/([0-9a-f-]{36})/i);

  return {
    stateCode: stateMatch?.[1]?.toUpperCase() ?? null,
    conversationId: conversationMatch?.[1] ?? null,
  };
}

export function buildChatAccessLogPayload(pathname: string): ChatAccessLogPayload | null {
  if (typeof window === "undefined" || !isChatAccessPath(pathname)) {
    return null;
  }

  const { stateCode, conversationId } = parseChatAccessPath(pathname);

  return {
    path: pathname,
    userAgent: navigator.userAgent.slice(0, 512),
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone.slice(0, 64),
    stateCode,
    conversationId,
  };
}

export function getClientIpFromRequest(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }

  return request.headers.get("x-real-ip")?.trim() ?? null;
}
