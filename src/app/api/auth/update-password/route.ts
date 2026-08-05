import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatAuthError } from "@/lib/auth/errors";
import { getSupabaseConfigError } from "@/lib/supabase/config";

export async function POST(request: Request) {
  const configError = getSupabaseConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  let body: { password?: string; confirmPassword?: string };
  try {
    body = (await request.json()) as { password?: string; confirmPassword?: string };
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const password = String(body.password ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");

  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: "A nova senha deve ter pelo menos 6 caracteres." },
      { status: 400 }
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      { error: "As senhas não coincidem." },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Link inválido ou expirado. Solicite uma nova recuperação de senha.",
        },
        { status: 401 }
      );
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return NextResponse.json(
        { error: formatAuthError(error) },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (caught) {
    return NextResponse.json(
      { error: formatAuthError(caught) },
      { status: 503 }
    );
  }
}
