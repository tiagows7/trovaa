"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";

export type AuthActionState = {
  error?: string;
} | null;

function getAuthErrorMessage(message: string, mode: "login" | "signup") {
  if (message === "Invalid login credentials") {
    return "E-mail ou senha incorretos.";
  }

  if (message === "Email not confirmed") {
    return "Conta ainda não confirmada. Tente novamente em instantes ou peça ajuda ao suporte.";
  }

  if (mode === "signup" && message.toLowerCase().includes("already registered")) {
    return "Este e-mail já está cadastrado. Tente entrar ou use outro e-mail.";
  }

  return message;
}

function isOldEnough(birthDate: string) {
  const born = new Date(`${birthDate}T12:00:00`);
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 13);
  return born <= minDate;
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "E-mail e senha são obrigatórios." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: getAuthErrorMessage(error.message, "login") };
  }

  redirect("/salas");
}

export async function signupAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "");
  const gender = String(formData.get("gender") ?? "");
  const acceptedTerms = formData.get("acceptedTerms") === "on";

  if (!acceptedTerms) {
    return { error: "Você precisa aceitar os Termos de Uso e a Política de Privacidade." };
  }

  if (!birthDate) {
    return { error: "Informe sua data de nascimento." };
  }

  if (!isOldEnough(birthDate)) {
    return { error: "É necessário ter pelo menos 13 anos para criar uma conta." };
  }

  if (!gender) {
    return { error: "Selecione uma opção de sexo." };
  }

  const displayName = username || email.split("@")[0];
  const acceptedAt = new Date().toISOString();
  const userMetadata = {
    username: displayName,
    birth_date: birthDate,
    gender,
    terms_accepted_at: acceptedAt,
    privacy_accepted_at: acceptedAt,
    legal_version: "1.0",
  };

  const admin = getAdminClientOrNull();

  if (admin) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (createError) {
      return { error: getAuthErrorMessage(createError.message, "signup") };
    }

    if (!created.user) {
      return { error: "Não foi possível criar a conta. Tente novamente." };
    }

    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return { error: getAuthErrorMessage(signInError.message, "login") };
    }

    redirect("/salas");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userMetadata,
    },
  });

  if (error) {
    return { error: getAuthErrorMessage(error.message, "signup") };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return {
      error:
        "Conta criada, mas o login automático falhou. Tente entrar manualmente.",
    };
  }

  redirect("/salas");
}
