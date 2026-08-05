import type { ProfileGender } from "@/types/database";

export const GENDER_OPTIONS: { value: ProfileGender; label: string }[] = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "outro", label: "Outro" },
];

export function getMinBirthDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 120);
  return date.toISOString().slice(0, 10);
}

export function getMaxBirthDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 13);
  return date.toISOString().slice(0, 10);
}

export function isOldEnough(birthDate: string) {
  const born = new Date(`${birthDate}T12:00:00`);
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 13);
  return born <= minDate;
}

export function normalizeBirthDate(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}
