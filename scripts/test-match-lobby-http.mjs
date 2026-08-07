/**
 * Testa GET /api/match-lobby/users em produção (ou BASE_URL) com sessão real.
 */
import { readFileSync } from "node:fs";

const PASSWORD = "teste123";
const STATE = "SP";
const BASE_URL = process.env.BASE_URL ?? "https://trovaa-zeta.vercel.app";

function loadEnv() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim().replace(/^"|"$/g, "");
  }
  return env;
}

function encodeSessionCookie(session) {
  const payload = JSON.stringify(session);
  return `base64-${Buffer.from(payload).toString("base64url")}`;
}

async function signIn(url, anon, email) {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anon,
    },
    body: JSON.stringify({ email, password: PASSWORD }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error_description ?? body.msg ?? "sign in failed");
  }

  return {
    userId: body.user.id,
    session: {
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      expires_in: body.expires_in,
      expires_at: body.expires_at,
      token_type: body.token_type,
      user: body.user,
    },
  };
}

async function publishPresence(baseUrl, cookie, payload) {
  const response = await fetch(`${baseUrl}/api/match-lobby/presence`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, body };
}

async function fetchUsers(baseUrl, cookie, stateCode) {
  const response = await fetch(
    `${baseUrl}/api/match-lobby/users?stateCode=${encodeURIComponent(stateCode)}`,
    {
      headers: { Cookie: cookie },
      cache: "no-store",
    }
  );
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, body };
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cookieName = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;

  const pedro = await signIn(url, anon, "pedro@test.trovaa");
  const ana = await signIn(url, anon, "ana@test.trovaa");

  const pedroCookie = `${cookieName}=${encodeSessionCookie(pedro.session)}`;
  const anaCookie = `${cookieName}=${encodeSessionCookie(ana.session)}`;

  const pedroPost = await publishPresence(BASE_URL, pedroCookie, {
    stateCode: STATE,
    gender: "masculino",
    lookingFor: "feminino",
  });
  const anaPost = await publishPresence(BASE_URL, anaCookie, {
    stateCode: STATE,
    gender: "feminino",
    lookingFor: "masculino",
  });

  console.log("POST Pedro:", pedroPost.status, pedroPost.body);
  console.log("POST Ana:", anaPost.status, anaPost.body);

  if (!pedroPost.ok || !anaPost.ok) {
    process.exit(1);
  }

  const pedroList = await fetchUsers(BASE_URL, pedroCookie, STATE);
  const anaList = await fetchUsers(BASE_URL, anaCookie, STATE);

  console.log("GET Pedro vê:", pedroList.status, pedroList.body);
  console.log("GET Ana vê:", anaList.status, anaList.body);

  const pedroSeesAna = (pedroList.body.users ?? []).some(
    (user) => user.userId === ana.userId
  );
  const anaSeesPedro = (anaList.body.users ?? []).some(
    (user) => user.userId === pedro.userId
  );

  if (!pedroSeesAna || !anaSeesPedro) {
    console.error("FAIL: usuários não se veem na API HTTP");
    process.exit(1);
  }

  console.log("PASS — API HTTP em", BASE_URL);
}

main().catch((error) => {
  console.error("FAIL:", error.message);
  process.exit(1);
});
