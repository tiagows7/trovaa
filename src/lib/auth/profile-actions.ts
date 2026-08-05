"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isOldEnough } from "@/lib/profile-form";
import type { ProfileGender } from "@/types/database";

export type ProfileActionState = {
  error?: string;
  success?: string;
} | null;

const VALID_GENDERS = new Set<ProfileGender>(["masculino", "feminino", "outro"]);

export async function updateProfileAction(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Faça login para alterar seus dados." };
  }

  const username = String(formData.get("username") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "");
  const gender = String(formData.get("gender") ?? "") as ProfileGender;
  const email = String(formData.get("email") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!username || username.length < 2) {
    return { error: "Informe um nome de usuário válido." };
  }

  if (!birthDate) {
    return { error: "Informe sua data de nascimento." };
  }

  if (!isOldEnough(birthDate)) {
    return { error: "É necessário ter pelo menos 13 anos." };
  }

  if (!VALID_GENDERS.has(gender)) {
    return { error: "Selecione uma opção de sexo." };
  }

  if (!email) {
    return { error: "Informe seu e-mail." };
  }

  if (newPassword || confirmPassword) {
    if (newPassword.length < 6) {
      return { error: "A nova senha deve ter pelo menos 6 caracteres." };
    }

    if (newPassword !== confirmPassword) {
      return { error: "A confirmação da senha não confere." };
    }
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      username,
      birth_date: birthDate,
      gender,
    })
    .eq("id", user.id);

  if (profileError) {
    return { error: profileError.message };
  }

  const authUpdates: { email?: string; password?: string; data?: Record<string, unknown> } = {
    data: {
      username,
      birth_date: birthDate,
      gender,
    },
  };

  if (email !== user.email) {
    authUpdates.email = email;
  }

  if (newPassword) {
    authUpdates.password = newPassword;
  }

  const { error: authError } = await supabase.auth.updateUser(authUpdates);

  if (authError) {
    return { error: authError.message };
  }

  revalidatePath("/conta");
  revalidatePath("/salas");

  if (authUpdates.email) {
    return {
      success:
        "Dados salvos. Se você alterou o e-mail, confira sua caixa de entrada para confirmar o novo endereço.",
    };
  }

  return { success: "Seus dados foram atualizados com sucesso." };
}
