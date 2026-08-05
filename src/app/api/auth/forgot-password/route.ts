import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatAuthError } from "@/lib/auth/errors";
import { getPasswordRecoveryRedirectUrl } from "@/lib/auth/urls";
import { getSupabaseConfigError } from "@/lib/supabase/config";

export async function POST(request: Request) {
  const configError = getSupabaseConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();

  if (!email) {
    return NextResponse.json({ error: "Informe seu e-mail." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordRecoveryRedirectUrl(),
    });

    if (error) {
      return NextResponse.json(
        { error: formatAuthError(error) },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        "Se existir uma conta com este e-mail, enviamos um link para redefinir a senha.",
    });
  } catch (caught) {
    return NextResponse.json(
      { error: formatAuthError(caught) },
      { status: 503 }
    );
  }
}
