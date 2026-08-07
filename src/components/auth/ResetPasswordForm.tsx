"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatAuthError } from "@/lib/auth/errors";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(formatAuthError(payload.error));
        setPending(false);
        return;
      }

      router.push("/salas");
      router.refresh();
    } catch (caught) {
      setError(formatAuthError(caught));
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Escolha uma nova senha para sua conta.
      </p>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-700 dark:text-slate-200">Nova senha</span>
        <input
          type="password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={6}
          autoComplete="new-password"
          required
          className="auth-form-input rounded-xl border border-zinc-400 px-4 py-3 outline-none ring-violet-500 focus:ring-2 dark:border-slate-500"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-700 dark:text-slate-200">
          Confirmar nova senha
        </span>
        <input
          type="password"
          name="confirmPassword"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={6}
          autoComplete="new-password"
          required
          className="auth-form-input rounded-xl border border-zinc-400 px-4 py-3 outline-none ring-violet-500 focus:ring-2 dark:border-slate-500"
        />
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
          {error}
          {error.includes("expirado") && (
            <Link
              href="/login/esqueci-senha"
              className="mt-2 block font-medium text-violet-600 hover:underline dark:text-violet-300"
            >
              Solicitar novo link
            </Link>
          )}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
