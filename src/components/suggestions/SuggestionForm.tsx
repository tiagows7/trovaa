"use client";

import { useActionState } from "react";
import {
  submitSuggestionAction,
  type SuggestionActionState,
} from "@/lib/suggestions/actions";

export function SuggestionForm() {
  const [state, formAction, pending] = useActionState<SuggestionActionState, FormData>(
    submitSuggestionAction,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">
          Sua sugestão de melhoria
        </span>
        <textarea
          name="content"
          rows={6}
          minLength={10}
          maxLength={2000}
          required
          placeholder="Conte o que podemos melhorar no Trovaa: novas funções, ajustes no chat, ideias para VIP..."
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none ring-violet-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </label>

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{state.error}</p>
      )}

      {state?.success && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {state.success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar sugestão"}
      </button>
    </form>
  );
}
