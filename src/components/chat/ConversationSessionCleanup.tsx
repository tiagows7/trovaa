"use client";

import { useEffect } from "react";

export const CONVERSA_SESSION_KEY = "trovaa-conversa-live";

export function ConversationSessionCleanup() {
  useEffect(() => {
    function handlePageHide() {
      sessionStorage.removeItem(CONVERSA_SESSION_KEY);
      void fetch("/api/conversations/end-all", {
        method: "POST",
        keepalive: true,
        credentials: "include",
      });
    }

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  return null;
}

export function markConversationSessionActive() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CONVERSA_SESSION_KEY, "1");
}
