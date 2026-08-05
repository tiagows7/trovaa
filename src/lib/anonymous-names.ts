const ANONYMOUS_NAMES = [
  "Lua",
  "Estrela",
  "Flor",
  "Brisa",
  "Sol",
  "Mar",
  "Rio",
  "Nuvem",
  "Aurora",
  "Violeta",
  "Coral",
  "Mistério",
  "Sereia",
  "Fênix",
  "Cometa",
  "Horizonte",
  "Brisa",
  "Céu",
  "Pétala",
  "Trovão",
  "Mel",
  "Íris",
  "Safira",
  "Canela",
  "Neblina",
  "Ventania",
  "Crepúsculo",
  "Alvorada",
  "Sereno",
  "Miragem",
];

function hashUserId(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getAnonymousDisplayName(userId: string) {
  const hash = hashUserId(userId);
  const name = ANONYMOUS_NAMES[hash % ANONYMOUS_NAMES.length];
  const suffix = (hash % 90) + 10;
  return `${name}${suffix}`;
}

export function getDisplayName(
  userId: string,
  username: string | null | undefined,
  viewerIsVip: boolean
) {
  if (viewerIsVip && username) {
    return username;
  }
  return getAnonymousDisplayName(userId);
}
