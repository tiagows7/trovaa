import type { SupabaseClient } from "@supabase/supabase-js";

export type SavedUserEntry = {
  savedUserId: string;
  username: string;
  lastStateCode: string | null;
};

export async function fetchSavedUsers(
  supabase: SupabaseClient,
  userId: string
): Promise<SavedUserEntry[]> {
  const { data: rows } = await supabase
    .from("saved_users")
    .select("saved_user_id, last_state_code")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!rows?.length) return [];

  const ids = rows.map((row) => row.saved_user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", ids);

  const usernameById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.username])
  );

  return rows.map((row) => ({
    savedUserId: row.saved_user_id,
    username: usernameById.get(row.saved_user_id) ?? "Usuário",
    lastStateCode: row.last_state_code,
  }));
}

export async function isUserSaved(
  supabase: SupabaseClient,
  userId: string,
  savedUserId: string
) {
  const { data } = await supabase
    .from("saved_users")
    .select("id")
    .eq("user_id", userId)
    .eq("saved_user_id", savedUserId)
    .maybeSingle();

  return Boolean(data);
}
