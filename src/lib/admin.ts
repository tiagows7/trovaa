import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";
import { isProfileVip } from "@/lib/vip";

function isMissingColumnError(message: string) {
  return message.includes("does not exist") || message.includes("Could not find");
}

export type VipStatus = {
  isVip: boolean;
  vipUntil: string | null;
};

export async function loadUserVipDetails(
  supabase: SupabaseClient,
  userId: string
): Promise<VipStatus> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_vip, vip_until")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingColumnError(error.message)) {
      return { isVip: false, vipUntil: null };
    }
    return { isVip: false, vipUntil: null };
  }

  return {
    isVip: isProfileVip(data ?? undefined),
    vipUntil: data?.vip_until ?? null,
  };
}

export async function loadUserVipStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { isVip } = await loadUserVipDetails(supabase, userId);
  return isVip;
}

export function isProfileAdmin(
  profile: Pick<Profile, "is_admin"> | null | undefined
) {
  return profile?.is_admin === true;
}

export async function resolveIsAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (!profileError && profile?.is_admin === true) {
    return true;
  }

  if (profileError && !isMissingColumnError(profileError.message)) {
    // coluna pode não existir ainda — tenta RPC
  }

  const { data: fromRpc, error: rpcError } = await supabase.rpc("is_admin");
  if (!rpcError && fromRpc === true) {
    return true;
  }

  return false;
}

export type UserProfileRoles = {
  isVip: boolean;
  isAdmin: boolean;
};

export async function loadUserProfileRoles(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfileRoles> {
  const [isVip, isAdmin] = await Promise.all([
    loadUserVipStatus(supabase, userId),
    resolveIsAdmin(supabase, userId),
  ]);

  return { isVip, isAdmin };
}

export type VisitStats = {
  totalVisits: number;
  visitsToday: number;
  uniqueVisitors: number;
};

export async function fetchVisitStats(
  supabase: SupabaseClient
): Promise<VisitStats> {
  const empty = { totalVisits: 0, visitsToday: 0, uniqueVisitors: 0 };

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [
    { count: totalVisits, error: totalError },
    { count: visitsToday, error: todayError },
    { data: visitorRows, error: visitorsError },
  ] = await Promise.all([
    supabase.from("site_visits").select("*", { count: "exact", head: true }),
    supabase
      .from("site_visits")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfDay.toISOString()),
    supabase.from("site_visits").select("visitor_key"),
  ]);

  const tableMissing =
    totalError?.message.includes("does not exist") ||
    totalError?.message.includes("Could not find") ||
    totalError?.code === "42P01";

  if (!totalError && !todayError && !visitorsError) {
    return {
      totalVisits: totalVisits ?? 0,
      visitsToday: visitsToday ?? 0,
      uniqueVisitors: new Set((visitorRows ?? []).map((row) => row.visitor_key)).size,
    };
  }

  if (tableMissing) {
    return empty;
  }

  const { data, error } = await supabase.rpc("get_site_visit_stats");

  if (error) {
    if (
      isMissingColumnError(error.message) ||
      error.message.includes("does not exist") ||
      error.message.includes("get_site_visit_stats")
    ) {
      return empty;
    }
    throw new Error(error.message);
  }

  const stats = (data ?? {}) as {
    total_visits?: number;
    visits_today?: number;
    unique_visitors?: number;
  };

  return {
    totalVisits: stats.total_visits ?? 0,
    visitsToday: stats.visits_today ?? 0,
    uniqueVisitors: stats.unique_visitors ?? 0,
  };
}

export type AdminStats = {
  totalUsers: number;
  vipUsers: number;
  nonVipUsers: number;
};

export async function fetchAdminStats(
  supabase: SupabaseClient
): Promise<AdminStats> {
  const { count: totalUsers, error: totalError } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  if (totalError) {
    throw new Error(totalError.message);
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("is_vip, vip_until");

  if (profilesError) {
    if (isMissingColumnError(profilesError.message)) {
      const total = totalUsers ?? 0;
      return { totalUsers: total, vipUsers: 0, nonVipUsers: total };
    }
    throw new Error(profilesError.message);
  }

  const vipUsers = (profiles ?? []).filter((profile) => isProfileVip(profile)).length;
  const total = totalUsers ?? profiles?.length ?? 0;

  return {
    totalUsers: total,
    vipUsers,
    nonVipUsers: Math.max(total - vipUsers, 0),
  };
}

export type AdminSuggestion = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
};

export async function fetchAllSuggestions(
  supabase: SupabaseClient
): Promise<AdminSuggestion[]> {
  const { data, error } = await supabase
    .from("suggestions")
    .select("id, content, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.length) return [];

  const userIds = [...new Set(data.map((row) => row.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", userIds);

  const usernameById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.username])
  );

  return data.map((row) => ({
    id: row.id,
    content: row.content,
    created_at: row.created_at,
    user_id: row.user_id,
    username: usernameById.get(row.user_id) ?? "Usuário",
  }));
}

export type ChatAccessLogStats = {
  totalLogs: number;
  logsToday: number;
  uniqueUsers: number;
};

export type ChatAccessLogEntry = {
  id: string;
  user_id: string;
  username: string;
  ip_address: string | null;
  user_agent: string | null;
  screen_resolution: string | null;
  timezone: string | null;
  path: string;
  state_code: string | null;
  conversation_id: string | null;
  created_at: string;
};

export async function fetchChatAccessLogStats(
  supabase: SupabaseClient
): Promise<ChatAccessLogStats> {
  const empty = { totalLogs: 0, logsToday: 0, uniqueUsers: 0 };

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [
    { count: totalLogs, error: totalError },
    { count: logsToday, error: todayError },
    { data: userRows, error: usersError },
  ] = await Promise.all([
    supabase.from("chat_access_logs").select("*", { count: "exact", head: true }),
    supabase
      .from("chat_access_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfDay.toISOString()),
    supabase.from("chat_access_logs").select("user_id"),
  ]);

  const tableMissing =
    totalError?.message.includes("does not exist") ||
    totalError?.message.includes("Could not find") ||
    totalError?.code === "42P01";

  if (tableMissing) {
    return empty;
  }

  if (totalError || todayError || usersError) {
    const message =
      totalError?.message ?? todayError?.message ?? usersError?.message ?? "Erro ao carregar registros.";
    throw new Error(message);
  }

  return {
    totalLogs: totalLogs ?? 0,
    logsToday: logsToday ?? 0,
    uniqueUsers: new Set((userRows ?? []).map((row) => row.user_id)).size,
  };
}

export async function fetchRecentChatAccessLogs(
  supabase: SupabaseClient,
  limit = 100
): Promise<ChatAccessLogEntry[]> {
  const { data, error } = await supabase
    .from("chat_access_logs")
    .select(
      "id, user_id, ip_address, user_agent, screen_resolution, timezone, path, state_code, conversation_id, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (
      error.message.includes("does not exist") ||
      error.message.includes("Could not find") ||
      error.code === "42P01"
    ) {
      return [];
    }
    throw new Error(error.message);
  }

  if (!data?.length) return [];

  const userIds = [...new Set(data.map((row) => row.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", userIds);

  const usernameById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.username])
  );

  return data.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    username: usernameById.get(row.user_id) ?? "Usuário",
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    screen_resolution: row.screen_resolution,
    timezone: row.timezone,
    path: row.path,
    state_code: row.state_code,
    conversation_id: row.conversation_id,
    created_at: row.created_at,
  }));
}
