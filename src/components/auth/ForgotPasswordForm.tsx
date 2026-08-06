"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatAuthError } from "@/lib/auth/errors";

const RESEND_COOLDOWN_SECONDS = 60;

function getCooldownKey(email: string) {
  return `trovaa:forgot-password:${email.trim().toLowerCase()}`;
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  useEffect(() => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setCooldownSeconds(0);
      return;
    }

    const storedUntil = Number(
      window.localStorage.getItem(getCooldownKey(normalizedEmail)) ?? 0
    );
    const remaining = Math.ceil((storedUntil - Date.now()) / 1000);
    setCooldownSeconds(Math.max(0, remaining));
  }, [email]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("Informe seu e-mail.");
      setPending(false);
      return;
    }

    if (cooldownSeconds > 0) {
      setError(`Aguarde ${cooldownSeconds}s antes de solicitar outro e-mail.`);
      setPending(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const payload = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        setError(formatAuthError(payload.error));
        setPending(false);
        return;
      }

      const until = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
      window.localStorage.setItem(getCooldownKey(normalizedEmail), String(until));
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);

      setSuccess(
        payload.message ??
          "Se existir uma conta com este e-mail, enviamos um link para redefinir a senha."
      );
      setPending(false);
    } catch (caught) {
      setError(formatAuthError(caught));
      setPending(false);
    }
  }

  const submitDisabled = pending || Boolean(success) || cooldownSeconds > 0;

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Informe o e-mail da sua conta. Enviaremos um link para criar uma nova senha.
      </p>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-700 dark:text-slate-200">E-mail</span>
        <input
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="seu@email.com"
          autoComplete="email"
          required
          className="rounded-xl border border-zinc-400 bg-white px-4 py-3 text-zinc-900 outline-none ring-violet-500 focus:ring-2 dark:border-slate-500 dark:bg-slate-900 dark:text-white"
        />
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={submitDisabled}
        className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {pending
          ? "Enviando..."
          : cooldownSeconds > 0
            ? `Aguarde ${cooldownSeconds}s`
            : "Enviar link de recuperação"}
      </button>

      <p className="text-center text-sm text-zinc-500 dark:text-slate-400">
        Lembrou a senha?{" "}
        <Link href="/login" className="font-medium text-violet-600 hover:underline dark:text-violet-300">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
