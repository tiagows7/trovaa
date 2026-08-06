import { NextResponse } from "next/server";
import { requestConnectionWithAdmin } from "@/lib/connections-server";
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

  let body: { targetId?: string; stateCode?: string };
  try {
    body = (await request.json()) as { targetId?: string; stateCode?: string };
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { targetId, stateCode } = body;

  if (!targetId || !stateCode) {
    return NextResponse.json(
      { error: "targetId and stateCode are required" },
      { status: 400 }
    );
  }

  try {
    const admin = getAdminClientOrNull() ?? createAdminClient();
    const result = await requestConnectionWithAdmin(
      admin,
      user.id,
      targetId,
      stateCode
    );

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível enviar o pedido de conexão.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
