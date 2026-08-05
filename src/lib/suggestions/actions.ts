"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SuggestionActionState = {
  error?: string;
  success?: string;
} | null;

export async function submitSuggestionAction(
  _prev: SuggestionActionState,
  formData: FormData
): Promise<SuggestionActionState> {
  const content = String(formData.get("content") ?? "").trim();

  if (content.length < 10) {
    return { error: "Descreva sua sugestão com pelo menos 10 caracteres." };
  }

  if (content.length > 2000) {
    return { error: "A sugestão pode ter no máximo 2000 caracteres." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Faça login para enviar uma sugestão." };
  }

  const { error } = await supabase.from("suggestions").insert({
    user_id: user.id,
    content,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/sugestoes");
  revalidatePath("/admin");

  return { success: "Sugestão enviada! Obrigado por ajudar a melhorar o Trovaa." };
}
