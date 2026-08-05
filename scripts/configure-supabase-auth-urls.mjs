/**
 * Configura Site URL e Redirect URLs no Supabase Auth (produção Vercel).
 *
 * Uso:
 *   $env:SUPABASE_ACCESS_TOKEN="sbp_..."   # PowerShell
 *   node scripts/configure-supabase-auth-urls.mjs
 *
 * Token: https://supabase.com/dashboard/account/tokens
 */

const PROJECT_REF = "musxexlbnwcvnjnsgzun";
const SITE_URL = "https://trovaa-zeta.vercel.app";
const REDIRECT_URLS = [
  `${SITE_URL}/**`,
  "http://localhost:3000/**",
  "https://*-.vercel.app/**",
];

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error("Defina SUPABASE_ACCESS_TOKEN (Personal Access Token do Supabase).");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

const baseUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;

const currentRes = await fetch(baseUrl, { headers });
if (!currentRes.ok) {
  console.error("Falha ao ler config auth:", currentRes.status, await currentRes.text());
  process.exit(1);
}

const current = await currentRes.json();
const mergedRedirects = [
  ...new Set([...(current.additional_redirect_urls ?? []), ...REDIRECT_URLS]),
];

const patchRes = await fetch(baseUrl, {
  method: "PATCH",
  headers,
  body: JSON.stringify({
    site_url: SITE_URL,
    additional_redirect_urls: mergedRedirects,
  }),
});

if (!patchRes.ok) {
  console.error("Falha ao atualizar config auth:", patchRes.status, await patchRes.text());
  process.exit(1);
}

const updated = await patchRes.json();
console.log("Supabase Auth configurado com sucesso.");
console.log("Site URL:", updated.site_url ?? SITE_URL);
console.log("Redirect URLs:", updated.additional_redirect_urls ?? mergedRedirects);
