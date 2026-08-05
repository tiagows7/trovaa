export function getAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}

export function getPasswordRecoveryRedirectUrl() {
  return `${getAppUrl()}/auth/callback?next=/login/redefinir-senha`;
}
