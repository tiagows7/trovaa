import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadUserVipDetails } from "@/lib/admin";
import { ConversationRoutePresence } from "@/components/chat/ConversationRoutePresence";
import { ConversationTabSync } from "@/components/chat/ConversationTabSync";
import type { ProfileGender } from "@/types/database";

export const dynamic = "force-dynamic";

type ConversationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: conversation }, vipDetails] = await Promise.all([
    supabase.from("profiles").select("gender").eq("id", user.id).maybeSingle(),
    supabase
      .from("conversations")
      .select("id, user_a_id, user_b_id, state_code, ended_at")
      .eq("id", id)
      .maybeSingle(),
    loadUserVipDetails(supabase, user.id),
  ]);

  if (
    !conversation ||
    conversation.ended_at ||
    (conversation.user_a_id !== user.id && conversation.user_b_id !== user.id)
  ) {
    redirect("/salas");
  }

  if (!profile?.gender) {
    redirect("/salas");
  }

  return (
    <>
      <ConversationRoutePresence
        conversationId={id}
        stateCode={conversation.state_code}
        userId={user.id}
        gender={profile.gender as ProfileGender}
        isVip={vipDetails.isVip}
      />
      <ConversationTabSync conversationId={id} />
    </>
  );
}
