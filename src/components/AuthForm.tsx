"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          username: username.trim() || email.split("@")[0],
        });

        if (profileError) {
          setError(profileError.message);
          setLoading(false);
          return;
        }
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
    }

    router.push("/chat");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      {mode === "signup" && (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-700">Nome de usuário</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Como você quer aparecer no chat"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none ring-violet-500 focus:ring-2"
            required
          />
        </label>
      )}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-700">E-mail</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none ring-violet-500 focus:ring-2"
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-700">Senha</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          minLength={6}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none ring-violet-500 focus:ring-2"
          required
        />
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
      >
        {loading
          ? "Aguarde..."
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
