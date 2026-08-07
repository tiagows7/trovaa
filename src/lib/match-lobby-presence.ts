import type { ProfileGender } from "@/types/database";
import type { PresenceUser } from "@/hooks/useStatePresence";

type LobbyPresencePayload = {
  stateCode: string;
  gender: ProfileGender;
  lookingFor?: ProfileGender | null;
  inConversation?: boolean;
  isVip?: boolean;
};

function normalizeStateCode(stateCode: string) {
  const normalized = stateCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw new Error("Invalid state code");
  }
  return normalized;
}

export async function publishMatchLobbyPresence(payload: LobbyPresencePayload) {
  const response = await fetch("/api/match-lobby/presence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stateCode: normalizeStateCode(payload.stateCode),
      gender: payload.gender,
      lookingFor: payload.lookingFor ?? null,
      inConversation: payload.inConversation ?? false,
      isVip: payload.isVip ?? false,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to publish lobby presence");
  }
}

export async function leaveMatchLobbyPresence() {
  await fetch("/api/match-lobby/presence", {
    method: "DELETE",
  }).catch(() => undefined);
}

export async function fetchMatchLobbyUsers(stateCode: string): Promise<PresenceUser[]> {
  const normalizedState = normalizeStateCode(stateCode);
  const response = await fetch(
    `/api/match-lobby/users?stateCode=${encodeURIComponent(normalizedState)}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch lobby users");
  }

  const body = (await response.json()) as { users?: PresenceUser[] };
  return body.users ?? [];
}
