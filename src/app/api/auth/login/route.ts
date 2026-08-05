import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatAuthError } from "@/lib/auth/errors";
import { getSupabaseConfigError } from "@/lib/supabase/config";

export async function POST(request: Request) {
  const configError = getSupabaseConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "E-mail e senha são obrigatórios." },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json(
        { error: formatAuthError(error, "E-mail ou senha incorretos.") },
        { status: 401 }
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
