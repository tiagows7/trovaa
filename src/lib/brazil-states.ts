export type BrazilianState = {
  code: string;
  name: string;
  region: string;
};

export const BRAZILIAN_STATES: BrazilianState[] = [
  { code: "AC", name: "Acre", region: "Norte" },
  { code: "AL", name: "Alagoas", region: "Nordeste" },
  { code: "AP", name: "Amapá", region: "Norte" },
  { code: "AM", name: "Amazonas", region: "Norte" },
  { code: "BA", name: "Bahia", region: "Nordeste" },
  { code: "CE", name: "Ceará", region: "Nordeste" },
  { code: "DF", name: "Distrito Federal", region: "Centro-Oeste" },
  { code: "ES", name: "Espírito Santo", region: "Sudeste" },
  { code: "GO", name: "Goiás", region: "Centro-Oeste" },
  { code: "MA", name: "Maranhão", region: "Nordeste" },
  { code: "MT", name: "Mato Grosso", region: "Centro-Oeste" },
  { code: "MS", name: "Mato Grosso do Sul", region: "Centro-Oeste" },
  { code: "MG", name: "Minas Gerais", region: "Sudeste" },
  { code: "PA", name: "Pará", region: "Norte" },
  { code: "PB", name: "Paraíba", region: "Nordeste" },
  { code: "PR", name: "Paraná", region: "Sul" },
  { code: "PE", name: "Pernambuco", region: "Nordeste" },
  { code: "PI", name: "Piauí", region: "Nordeste" },
  { code: "RJ", name: "Rio de Janeiro", region: "Sudeste" },
  { code: "RN", name: "Rio Grande do Norte", region: "Nordeste" },
  { code: "RS", name: "Rio Grande do Sul", region: "Sul" },
  { code: "RO", name: "Rondônia", region: "Norte" },
  { code: "RR", name: "Roraima", region: "Norte" },
  { code: "SC", name: "Santa Catarina", region: "Sul" },
  { code: "SP", name: "São Paulo", region: "Sudeste" },
  { code: "SE", name: "Sergipe", region: "Nordeste" },
  { code: "TO", name: "Tocantins", region: "Norte" },
];

const stateMap = new Map(BRAZILIAN_STATES.map((state) => [state.code, state]));

export function isValidStateCode(code: string): boolean {
  return stateMap.has(code.toUpperCase());
}

export function getStateByCode(code: string): BrazilianState | undefined {
  return stateMap.get(code.toUpperCase());
}

export function getStatesByRegion() {
  return BRAZILIAN_STATES.reduce<Record<string, BrazilianState[]>>(
    (groups, state) => {
      if (!groups[state.region]) groups[state.region] = [];
      groups[state.region].push(state);
      return groups;
    },
    {}
  );
}
