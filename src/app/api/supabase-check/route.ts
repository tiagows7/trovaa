import { NextResponse } from "next/server";
import { checkSupabaseReachable } from "@/lib/supabase/config";

export async function GET() {
  const error = await checkSupabaseReachable();

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
