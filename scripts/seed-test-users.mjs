import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const TEST_PASSWORD = "teste123";

const TEST_USERS = [
  {
    email: "marina.vip@test.trovaa",
    username: "Marina Silva",
    gender: "feminino",
    birth_date: "1998-03-12",
    isVip: true,
  },
  {
    email: "lucas.vip@test.trovaa",
    username: "Lucas Ferreira",
    gender: "masculino",
    birth_date: "1995-07-22",
    isVip: true,
  },
  {
    email: "beatriz.vip@test.trovaa",
    username: "Beatriz Costa",
    gender: "feminino",
    birth_date: "1992-11-05",
    isVip: true,
  },
  {
    email: "ana@test.trovaa",
    username: "Ana Souza",
    gender: "feminino",
    birth_date: "2000-01-18",
    isVip: false,
  },
  {
    email: "pedro@test.trovaa",
    username: "Pedro Lima",
    gender: "masculino",
    birth_date: "1999-08-30",
    isVip: false,
  },
  {
    email: "carla@test.trovaa",
    username: "Carla Mendes",
    gender: "feminino",
    birth_date: "1997-04-14",
    isVip: false,
  },
  {
    email: "rafael@test.trovaa",
    username: "Rafael Dias",
    gender: "masculino",
    birth_date: "1996-12-01",
    isVip: false,
  },
  {
    email: "julia@test.trovaa",
    username: "Júlia Rocha",
    gender: "feminino",
    birth_date: "2001-06-09",
    isVip: false,
  },
];

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function getVipUntil() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString();
}

async function upsertTestUser(admin, user) {
  const metadata = {
    username: user.username,
    birth_date: user.birth_date,
    gender: user.gender,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    legal_version: "1.0",
  };

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw listError;
  }

  const existing = listed.users.find(
    (entry) => entry.email?.toLowerCase() === user.email.toLowerCase()
  );

  let userId = existing?.id;

  if (existing) {
    const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (updateError) {
      throw updateError;
    }
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: user.email,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (createError) {
      throw createError;
    }

    userId = created.user?.id;
  }

  if (!userId) {
    throw new Error(`Não foi possível obter o ID de ${user.email}`);
  }

  const profileUpdate = {
    username: user.username,
    birth_date: user.birth_date,
    gender: user.gender,
    is_vip: user.isVip,
    vip_until: user.isVip ? getVipUntil() : null,
  };

  const { error: profileError } = await admin
    .from("profiles")
    .upsert(
      {
        id: userId,
        ...profileUpdate,
      },
      { onConflict: "id" }
    );

  if (profileError) {
    const { error: updateProfileError } = await admin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", userId);

    if (updateProfileError) {
      throw updateProfileError;
    }
  }

  return {
    email: user.email,
    username: user.username,
    isVip: user.isVip,
    password: TEST_PASSWORD,
  };
}

async function main() {
  loadEnvFile(resolve(".env.local"));
  loadEnvFile(resolve(".env"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local"
    );
    process.exit(1);
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log("Criando usuários de teste...\n");

  const created = [];

  for (const user of TEST_USERS) {
    const result = await upsertTestUser(admin, user);
    created.push(result);
    console.log(
      `✓ ${result.username} (${result.email}) — ${result.isVip ? "VIP" : "comum"}`
    );
  }

  console.log("\nSenha de todos os usuários de teste:", TEST_PASSWORD);
  console.log("\nContas VIP:");
  for (const user of created.filter((entry) => entry.isVip)) {
    console.log(`  ${user.email}`);
  }
  console.log("\nContas comuns:");
  for (const user of created.filter((entry) => !entry.isVip)) {
    console.log(`  ${user.email}`);
  }
}

main().catch((error) => {
  console.error("Falha ao criar usuários de teste:", error.message ?? error);
  process.exit(1);
});
