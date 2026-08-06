import { NextResponse } from "next/server";
import { acceptConnectionWithAdmin } from "@/lib/connections-server";
import { createAdminClient, getAdminClientOrNull } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { requestId?: string };
  try {
    body = (await request.json()) as { requestId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { requestId } = body;

  if (!requestId) {
    return NextResponse.json({ error: "requestId is required" }, { status: 400 });
  }

  try {
    const admin = getAdminClientOrNull() ?? createAdminClient();
    const conversationId = await acceptConnectionWithAdmin(
      admin,
      user.id,
      requestId
    );

    return NextResponse.json({ conversationId });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível aceitar o pedido de conexão.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
