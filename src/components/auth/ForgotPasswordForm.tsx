"use client";

import Link from "next/link";
import { useState } from "react";
import { formatAuthError } from "@/lib/auth/errors";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
        disabled={pending || Boolean(success)}
        className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar link de recuperação"}
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
