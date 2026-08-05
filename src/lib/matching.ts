import type { ProfileGender } from "@/types/database";

export const PARTNER_GENDER_OPTIONS: {
  value: ProfileGender;
  label: string;
  description: string;
}[] = [
  {
    value: "masculino",
    label: "Homem",
    description: "Conversar com um homem",
  },
  {
    value: "feminino",
    label: "Mulher",
    description: "Conversar com uma mulher",
  },
  {
    value: "outro",
    label: "Outro",
    description: "Conversar com pessoa de outro gênero",
  },
];

export function getPartnerGenderLabel(gender: ProfileGender) {
  return PARTNER_GENDER_OPTIONS.find((option) => option.value === gender)?.label ?? gender;
}

export function getConnectedListTitle(gender: ProfileGender) {
  switch (gender) {
    case "masculino":
      return "Homens conectados";
    case "feminino":
      return "Mulheres conectadas";
    default:
      return "Pessoas conectadas";
  }
}
