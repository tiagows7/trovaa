export function formatAuthError(error: unknown, fallback = "Não foi possível entrar. Tente novamente.") {
  if (!error) return fallback;

  if (typeof error === "string") {
    const text = error.trim();
    if (!text || text === "{}") return fallback;
    return mapKnownAuthMessages(text);
  }

  if (typeof error === "object") {
    const authError = error as {
      message?: string;
      msg?: string;
      code?: string | number;
      status?: number;
      error_code?: string;
    };

    const text = (authError.message ?? authError.msg ?? "").trim();

    if (text && text !== "{}") {
      return mapKnownAuthMessages(text);
    }

    if (
      authError.error_code === "unexpected_failure" ||
      authError.code === "unexpected_failure" ||
      authError.status === 500
    ) {
      return "Conta de teste com problema no banco. Rode supabase/fix-test-users-login.sql no Supabase.";
    }
  }

  return fallback;
}

function mapKnownAuthMessages(message: string) {
  if (message === "Invalid login credentials") {
    return "E-mail ou senha incorretos.";
  }

  if (message.includes("Database error querying schema")) {
    return "Conta de teste com problema no banco. Rode supabase/fix-test-users-login.sql no Supabase.";
  }

  if (message === "Failed to fetch" || message.includes("fetch failed")) {
    return "Não foi possível conectar ao servidor de autenticação. Verifique sua internet e tente novamente.";
  }

  if (message === "Email not confirmed") {
    return "Conta ainda não confirmada. Rode supabase/disable-email-confirmation.sql no Supabase.";
  }

  if (message.includes("For security purposes, you can only request this after")) {
    return "Aguarde alguns segundos antes de solicitar outro e-mail de recuperação.";
  }

  if (message.includes("Password should be at least")) {
    return "A senha deve ter pelo menos 6 caracteres.";
  }

  return message;
}
