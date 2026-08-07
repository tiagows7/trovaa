import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConversationTabSync } from "@/components/chat/ConversationTabSync";
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

  const [{ data: profile }, { data: conversation }] = await Promise.all([
    supabase.from("profiles").select("gender").eq("id", user.id).maybeSingle(),
    supabase
      .from("conversations")
      .select("id, user_a_id, user_b_id, state_code, ended_at")
      .eq("id", id)
      .maybeSingle(),
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

  return <ConversationTabSync conversationId={id} />;
}
