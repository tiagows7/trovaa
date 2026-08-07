import { NextResponse } from "next/server";
import { createAdminClient, getAdminClientOrNull } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ProfileGender } from "@/types/database";

function normalizeStateCode(stateCode: string) {
  const normalized = stateCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw new Error("Invalid state code");
  }
  return normalized;
}

function isProfileGender(value: unknown): value is ProfileGender {
  return value === "masculino" || value === "feminino" || value === "outro";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    stateCode?: string;
    gender?: ProfileGender;
    lookingFor?: ProfileGender | null;
    inConversation?: boolean;
    isVip?: boolean;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.stateCode || !isProfileGender(body.gender)) {
    return NextResponse.json(
      { error: "stateCode and gender are required" },
      { status: 400 }
    );
  }

  if (body.lookingFor != null && !isProfileGender(body.lookingFor)) {
    return NextResponse.json({ error: "Invalid lookingFor" }, { status: 400 });
  }

  try {
    const admin = getAdminClientOrNull() ?? createAdminClient();
    const stateCode = normalizeStateCode(body.stateCode);
    const preferredGender = body.lookingFor ?? body.gender;

    const { error } = await admin.from("match_queue").upsert(
      {
        user_id: user.id,
        state_code: stateCode,
        preferred_gender: preferredGender,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to publish presence";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getAdminClientOrNull() ?? createAdminClient();
    const { error } = await admin
      .from("match_queue")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to leave lobby";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
