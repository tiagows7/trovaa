import type { ProfileGender } from "@/types/database";
import type { PresenceUser } from "@/hooks/useStatePresence";

function genderPairMatches(
  sought: ProfileGender,
  profileGender: ProfileGender
) {
  if (sought === "outro" || profileGender === "outro") {
    return true;
  }

  return sought === profileGender;
}

/**
 * `candidate.lookingFor` e `viewerLookingFor` = perfil que cada um escolheu
 * na sala (Homem / Mulher), ou null se ainda está na tela inicial.
 */
export function isMutualMatch(
  viewerGender: ProfileGender,
  preferredGender: ProfileGender,
  candidate: PresenceUser,
  viewerLookingFor: ProfileGender | null = null
): boolean {
  if (candidate.gender !== preferredGender) {
    return false;
  }

  const candidateSeeksViewer =
    candidate.lookingFor === null ||
    candidate.lookingFor === undefined ||
    genderPairMatches(candidate.lookingFor, viewerGender);

  if (!candidateSeeksViewer) {
    return false;
  }

  if (viewerLookingFor === null || viewerLookingFor === undefined) {
    return true;
  }

  return genderPairMatches(viewerLookingFor, candidate.gender);
}

export function filterMatchableUsers(
  users: PresenceUser[],
  viewerGender: ProfileGender,
  preferredGender: ProfileGender,
  viewerLookingFor: ProfileGender | null = null
) {
  return users.filter((user) =>
    isMutualMatch(viewerGender, preferredGender, user, viewerLookingFor)
  );
}

export function filterConnectableUsers(
  users: PresenceUser[],
  viewerGender: ProfileGender,
  preferredGender: ProfileGender,
  viewerLookingFor: ProfileGender | null = null
) {
  return users.filter((user) =>
    isUserConnectable(
      getUserAvailability(
        viewerGender,
        preferredGender,
        user,
        viewerLookingFor
      )
    )
  );
}

export function countUsersByGender(users: PresenceUser[], gender: ProfileGender) {
  return users.filter((user) => user.gender === gender).length;
}

export function countUsersInConversationByGender(
  users: PresenceUser[],
  gender: ProfileGender
) {
  return users.filter((user) => user.gender === gender && user.inConversation)
    .length;
}

export function countMatchableUsersByGender(
  users: PresenceUser[],
  viewerGender: ProfileGender,
  preferredGender: ProfileGender,
  viewerLookingFor: ProfileGender | null = null
) {
  return users.filter((user) =>
    isMutualMatch(viewerGender, preferredGender, user, viewerLookingFor)
  ).length;
}

export function countConnectableUsersByGender(
  users: PresenceUser[],
  viewerGender: ProfileGender,
  preferredGender: ProfileGender,
  viewerLookingFor: ProfileGender | null = null
) {
  return filterConnectableUsers(
    users,
    viewerGender,
    preferredGender,
    viewerLookingFor
  ).filter((user) => user.gender === preferredGender).length;
}

export function filterVisibleUsersByGender(
  users: PresenceUser[],
  preferredGender: ProfileGender
) {
  return users.filter((user) => user.gender === preferredGender);
}

export type UserAvailability =
  | "connectable"
  | "also_in_conversation"
  | "busy_in_conversation"
  | "waiting_profile";

export function getUserAvailability(
  viewerGender: ProfileGender,
  preferredGender: ProfileGender,
  user: PresenceUser,
  viewerLookingFor: ProfileGender | null = null
): UserAvailability {
  if (!isMutualMatch(viewerGender, preferredGender, user, viewerLookingFor)) {
    return "waiting_profile";
  }

  if (user.inConversation) {
    return user.isVip ? "also_in_conversation" : "busy_in_conversation";
  }

  return "connectable";
}

export function isUserConnectable(availability: UserAvailability) {
  return availability === "connectable" || availability === "also_in_conversation";
}

export function getUnavailableMatchHint(
  viewerGender: ProfileGender,
  preferredGender: ProfileGender,
  user: PresenceUser
) {
  if (user.lookingFor && !genderPairMatches(user.lookingFor, viewerGender)) {
    return "Esta pessoa está buscando outro perfil agora.";
  }

  if (user.gender !== preferredGender) {
    return "Perfil diferente do filtro selecionado.";
  }

  return "Aguardando compatibilidade de filtros.";
}
