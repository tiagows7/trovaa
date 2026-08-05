"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  buildChatAccessLogPayload,
  getChatAccessSessionKey,
  isChatAccessPath,
} from "@/lib/chat-access-log";

export function ChatAccessLogger() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !isChatAccessPath(pathname)) return;

    const sessionKey = getChatAccessSessionKey(pathname);
    if (sessionStorage.getItem(sessionKey)) return;

    const payload = buildChatAccessLogPayload(pathname);
    if (!payload) return;

    void fetch("/api/chat/access-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as { recorded?: boolean };
        if (data.recorded) {
          sessionStorage.setItem(sessionKey, "1");
        }
      })
      .catch(() => {
        // Falha silenciosa para não atrapalhar o uso do chat.
      });
  }, [pathname]);

  return null;
}
