"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signupAction, type AuthActionState } from "@/lib/auth/actions";
import { formatAuthError } from "@/lib/auth/errors";
import { getSupabaseConfigError } from "@/lib/supabase/config";

type ProfileGender = "masculino" | "feminino" | "outro";

const GENDER_OPTIONS: { value: ProfileGender; label: string }[] = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "outro", label: "Outro" },
];

function getMinBirthDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 120);
  return date.toISOString().slice(0, 10);
}

function getMaxBirthDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 13);
  return date.toISOString().slice(0, 10);
}

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [signupState, signupActionBound, signupPending] = useActionState<
    AuthActionState,
    FormData
  >(signupAction, null);

  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<ProfileGender | "">("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginPending, setLoginPending] = useState(false);

  useEffect(() => {
    const configIssue = getSupabaseConfigError();
    if (configIssue) {
      setConfigError(configIssue);
    }
  }, []);

  const signupIncomplete =
    mode === "signup" && (!acceptedTerms || !birthDate || !gender);

  const pending = mode === "signup" ? signupPending : loginPending;
  const signupError =
    typeof signupState?.error === "string" ? signupState.error : null;
  const errorMessage = mode === "signup" ? signupError : loginError;

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError(null);
    setLoginPending(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setLoginError("E-mail e senha são obrigatórios.");
      setLoginPending(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      let payload: { error?: string } | null = null;
      try {
        payload = (await response.json()) as { error?: string };
      } catch {
        payload = null;
      }

      if (!response.ok) {
        setLoginError(
          formatAuthError(payload?.error, "E-mail ou senha incorretos.")
        );
        setLoginPending(false);
        return;
      }

      router.push("/salas");
      router.refresh();
    } catch (caught) {
      setLoginError(formatAuthError(caught));
      setLoginPending(false);
    }
  }

  return (
    <form
      action={mode === "signup" ? signupActionBound : undefined}
      onSubmit={mode === "login" ? handleLogin : undefined}
      className="flex w-full max-w-md flex-col gap-4"
    >
      {mode === "signup" && (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-700">Nome de usuário</span>
          <input
            type="text"
            name="username"
            placeholder="Como você quer aparecer no chat"
            autoComplete="username"
            suppressHydrationWarning
            className="rounded-xl border border-zinc-400 dark:border-slate-500 bg-white px-4 py-3 text-zinc-900 outline-none ring-violet-500 focus:ring-2"
            required
          />
        </label>
      )}

      {mode === "signup" && (
        <>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-700">Data de nascimento</span>
            <input
              type="date"
              name="birthDate"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              min={getMinBirthDate()}
              max={getMaxBirthDate()}
              required
              className="rounded-xl border border-zinc-400 dark:border-slate-500 bg-white px-4 py-3 text-zinc-900 outline-none ring-violet-500 focus:ring-2"
            />
          </label>

          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="font-medium text-zinc-700">Sexo</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {GENDER_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center justify-center rounded-xl border px-4 py-3 transition ${
                    gender === option.value
                      ? "border-violet-500 bg-violet-50 text-violet-700 ring-2 ring-violet-500"
                      : "border-zinc-400 dark:border-slate-500 bg-white text-zinc-700 hover:border-violet-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={option.value}
                    checked={gender === option.value}
                    onChange={() => setGender(option.value)}
                    className="sr-only"
                    required
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-700">E-mail</span>
        <input
          type="email"
          name="email"
          placeholder="seu@email.com"
          autoComplete="email"
          suppressHydrationWarning
          className="rounded-xl border border-zinc-400 dark:border-slate-500 bg-white px-4 py-3 text-zinc-900 outline-none ring-violet-500 focus:ring-2"
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-700">Senha</span>
        <input
          type="password"
          name="password"
          placeholder="Mínimo 6 caracteres"
          minLength={6}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          suppressHydrationWarning
          className="rounded-xl border border-zinc-400 dark:border-slate-500 bg-white px-4 py-3 text-zinc-900 outline-none ring-violet-500 focus:ring-2"
          required
        />
        {mode === "login" && (
          <Link
            href="/login/esqueci-senha"
            className="mt-1 self-end text-xs font-medium text-violet-600 hover:underline dark:text-violet-300"
          >
            Esqueci minha senha
          </Link>
        )}
      </label>

      {mode === "signup" && (
        <label className="flex items-start gap-3 text-sm text-zinc-600">
          <input
            type="checkbox"
            name="acceptedTerms"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
            required
          />
          <span>
            Li e aceito os{" "}
            <Link
              href="/termos-de-uso"
              target="_blank"
              className="font-medium text-violet-600 hover:underline"
            >
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link
              href="/politica-de-privacidade"
              target="_blank"
              className="font-medium text-violet-600 hover:underline"
            >
              Política de Privacidade
            </Link>
            .
          </span>
        </label>
      )}

      {configError && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {configError}
        </p>
      )}

      {errorMessage && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || signupIncomplete}
        className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {pending
          ? mode === "signup"
            ? "Criando conta..."
            : "Entrando..."
          : mode === "signup"
            ? "Criar conta"
            : "Entrar"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        {mode === "signup" ? (
          <>
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-violet-600 hover:underline">
              Entrar
            </Link>
          </>
        ) : (
          <>
            Novo por aqui?{" "}
            <Link href="/signup" className="font-medium text-violet-600 hover:underline">
              Criar conta
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
