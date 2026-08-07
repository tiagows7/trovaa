"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { endAllActiveConversations } from "@/lib/conversations";
import { useStatePresenceContext } from "@/contexts/StatePresenceContext";
import { useOptionalConversationTabs } from "@/contexts/ConversationTabsContext";

export function SignOutButton({
  className,
  onBeforeSignOut,
}: {
  className?: string;
  onBeforeSignOut?: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { clearPresence } = useStatePresenceContext();
  const conversationTabs = useOptionalConversationTabs();

  async function handleSignOut() {
    onBeforeSignOut?.();
    await clearPresence();
    await endAllActiveConversations(supabase);
    conversationTabs?.clearAllTabs();
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={
        className ??
        "rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      }
    >
      Sair
    </button>
  );
}
