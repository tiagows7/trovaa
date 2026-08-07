import { NextResponse } from "next/server";
import { createAdminClient, getAdminClientOrNull } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isProfileVip } from "@/lib/vip";
import type { ProfileGender } from "@/types/database";

function normalizeStateCode(stateCode: string) {
  const normalized = stateCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw new Error("Invalid state code");
  }
  return normalized;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stateCode = new URL(request.url).searchParams.get("stateCode");
  if (!stateCode) {
    return NextResponse.json({ error: "stateCode is required" }, { status: 400 });
  }

  try {
    const admin = getAdminClientOrNull() ?? createAdminClient();
    const normalizedState = normalizeStateCode(stateCode);
    const staleBefore = new Date(Date.now() - 45_000).toISOString();

    const [{ data: queueRows, error: queueError }, { data: conversations }] =
      await Promise.all([
        admin
          .from("match_queue")
          .select("user_id, preferred_gender, created_at")
          .eq("state_code", normalizedState)
          .gt("created_at", staleBefore)
          .neq("user_id", user.id),
        admin
          .from("conversations")
          .select("user_a_id, user_b_id")
          .eq("state_code", normalizedState)
          .is("ended_at", null),
      ]);

    if (queueError) {
      return NextResponse.json({ error: queueError.message }, { status: 500 });
    }

    const userIds = (queueRows ?? []).map((row) => row.user_id as string);
    if (userIds.length === 0) {
      return NextResponse.json({ users: [] });
    }

    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, gender, is_vip, vip_until")
      .in("id", userIds);

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    const profileById = new Map(
      (profiles ?? []).map((profile) => [profile.id as string, profile])
    );

    const busyUserIds = new Set<string>();
    for (const conversation of conversations ?? []) {
      busyUserIds.add(conversation.user_a_id as string);
      busyUserIds.add(conversation.user_b_id as string);
    }

    const users = (queueRows ?? [])
      .map((row) => {
        const profile = profileById.get(row.user_id as string);
        if (!profile?.gender) return null;

        return {
          userId: row.user_id as string,
          gender: profile.gender as ProfileGender,
          lookingFor: (row.preferred_gender as ProfileGender | null) ?? null,
          inConversation: busyUserIds.has(row.user_id as string),
          isVip: isProfileVip(profile),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    return NextResponse.json({ users });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list lobby users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
