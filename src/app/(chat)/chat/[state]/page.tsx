import { redirect, notFound } from "next/navigation";
import { MatchFlow } from "@/components/chat/MatchFlow";
import { createClient } from "@/lib/supabase/server";
import { getStateByCode } from "@/lib/brazil-states";
import { fetchSavedUsers } from "@/lib/saved-users";
import { loadUserProfileRoles } from "@/lib/admin";
import type { ProfileGender } from "@/types/database";

export const dynamic = "force-dynamic";

type ChatStatePageProps = {
  params: Promise<{ state: string }>;
};

export default async function ChatStatePage({ params }: ChatStatePageProps) {
  const { state } = await params;
  const stateCode = state.toUpperCase();
  const stateInfo = getStateByCode(stateCode);

  if (!stateInfo) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, roles] = await Promise.all([
    supabase.from("profiles").select("gender").eq("id", user.id).single(),
    loadUserProfileRoles(supabase, user.id),
  ]);

  const savedUsers = roles.isVip ? await fetchSavedUsers(supabase, user.id) : [];

  return (
    <MatchFlow
      userId={user.id}
      stateCode={stateCode}
      stateName={stateInfo.name}
      userGender={(profile?.gender as ProfileGender | null) ?? null}
      isVip={roles.isVip}
      isAdmin={roles.isAdmin}
      initialSavedUsers={savedUsers}
    />
  );
}
