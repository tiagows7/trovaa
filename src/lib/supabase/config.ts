const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getProjectRefFromAnonKey(anonKey: string): string | null {
  try {
    const payload = anonKey.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(normalized, "base64").toString("utf8");
    const data = JSON.parse(json) as { ref?: string };
    return data.ref ?? null;
  } catch {
    return null;
  }
}

function getProjectRefFromUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    if (!hostname.endsWith(".supabase.co")) return null;
    return hostname.replace(".supabase.co", "");
  } catch {
    return null;
  }
}

export function getSupabaseConfig() {
  return {
    url: SUPABASE_URL ?? "",
    anonKey: SUPABASE_ANON_KEY ?? "",
  };
}

export function getSupabaseConfigError(): string | null {
  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey) {
    return "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local";
  }

  if (url.includes("seu-projeto") || url.includes("seu-project-ref") || anonKey.includes("sua-chave")) {
    return "Substitua os valores de exemplo em .env.local pelas credenciais reais do Supabase";
  }

  if (!url.endsWith(".supabase.co")) {
    return "A URL do Supabase deve ser https://<id-do-projeto>.supabase.co (veja em Project Settings → API)";
  }

  const refFromKey = getProjectRefFromAnonKey(anonKey);
  const refFromUrl = getProjectRefFromUrl(url);

  if (refFromKey && refFromUrl && refFromKey !== refFromUrl) {
    return `A URL está errada. Com essa chave anon, use: https://${refFromKey}.supabase.co`;
  }

  return null;
}

export async function checkSupabaseReachable(): Promise<string | null> {
  const configError = getSupabaseConfigError();
  if (configError) return configError;

  const { url, anonKey } = getSupabaseConfig();

  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      return `Supabase respondeu com erro ${response.status}. Verifique URL e chave anon no painel.`;
    }

    return null;
  } catch {
    return "Não foi possível conectar ao Supabase. O projeto pode estar pausado, a URL pode estar errada, ou há bloqueio de rede/DNS.";
  }
}
