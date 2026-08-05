"use client";

import { useActionState } from "react";
import {
  updateProfileAction,
  type ProfileActionState,
} from "@/lib/auth/profile-actions";
import {
  GENDER_OPTIONS,
  getMaxBirthDate,
  getMinBirthDate,
  normalizeBirthDate,
} from "@/lib/profile-form";
import type { ProfileGender } from "@/types/database";

type ProfileSettingsFormProps = {
  email: string;
  username: string;
  birthDate: string;
  gender: ProfileGender | "";
};

export function ProfileSettingsForm({
  email,
  username,
  birthDate,
  gender,
}: ProfileSettingsFormProps) {
  const [state, formAction, pending] = useActionState<
    ProfileActionState,
    FormData
  >(updateProfileAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">
          Nome de usuário
        </span>
        <input
          type="text"
          name="username"
          defaultValue={username}
          autoComplete="username"
          required
          minLength={2}
          maxLength={80}
          className="profile-form-input rounded-xl border px-4 py-3 outline-none ring-violet-500 focus:ring-2"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">
          Data de nascimento
        </span>
        <input
          type="date"
          name="birthDate"
          defaultValue={normalizeBirthDate(birthDate)}
          min={getMinBirthDate()}
          max={getMaxBirthDate()}
          required
          className="profile-form-input rounded-xl border px-4 py-3 outline-none ring-violet-500 focus:ring-2"
        />
      </label>

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="font-medium text-slate-700 dark:text-slate-200">
          Sexo
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {GENDER_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition has-checked:border-violet-500 has-checked:bg-violet-50 has-checked:text-violet-700 has-checked:ring-2 has-checked:ring-violet-500"
            >
              <input
                type="radio"
                name="gender"
                value={option.value}
                defaultChecked={gender === option.value}
                className="sr-only"
                required
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">
          E-mail
        </span>
        <input
          type="email"
          name="email"
          defaultValue={email}
          autoComplete="email"
          required
          className="profile-form-input rounded-xl border px-4 py-3 outline-none ring-violet-500 focus:ring-2"
        />
      </label>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
          Alterar senha
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Deixe em branco se não quiser trocar a senha agora.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">
              Nova senha
            </span>
            <input
              type="password"
              name="newPassword"
              minLength={6}
              autoComplete="new-password"
              className="profile-form-input rounded-xl border px-4 py-3 outline-none ring-violet-500 focus:ring-2"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">
              Confirmar nova senha
            </span>
            <input
              type="password"
              name="confirmPassword"
              minLength={6}
              autoComplete="new-password"
              className="profile-form-input rounded-xl border px-4 py-3 outline-none ring-violet-500 focus:ring-2"
            />
          </label>
        </div>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
          {state.error}
        </p>
      )}

      {state?.success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {state.success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}
