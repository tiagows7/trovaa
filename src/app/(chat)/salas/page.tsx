import { redirect } from "next/navigation";
import { SalasClient } from "@/components/salas/SalasClient";
import { loadUserProfileRoles } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SalasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const roles = await loadUserProfileRoles(supabase, user.id);

  return (
    <SalasClient
      userId={user.id}
      isVip={roles.isVip}
      isAdmin={roles.isAdmin}
    />
  );
}
