"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { endAllActiveConversations } from "@/lib/conversations";
import { useStatePresenceContext } from "@/contexts/StatePresenceContext";
import { useOptionalConversationTabs } from "@/contexts/ConversationTabsContext";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();
  const { clearPresence } = useStatePresenceContext();
  const conversationTabs = useOptionalConversationTabs();

  async function handleSignOut() {
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
      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
    >
      Sair
    </button>
  );
}
