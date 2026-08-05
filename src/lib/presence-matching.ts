import type { ProfileGender } from "@/types/database";
import type { PresenceUser } from "@/hooks/useStatePresence";

export function isMutualMatch(
  viewerGender: ProfileGender,
  preferredGender: ProfileGender,
  candidate: PresenceUser
): boolean {
  if (candidate.gender !== preferredGender) {
    return false;
  }

  if (!candidate.lookingFor) {
    return true;
  }

  if (candidate.lookingFor === "outro" || viewerGender === "outro") {
    return true;
  }

  return candidate.lookingFor === viewerGender;
}

export function filterMatchableUsers(
  users: PresenceUser[],
  viewerGender: ProfileGender,
  preferredGender: ProfileGender
) {
  return users.filter((user) => isMutualMatch(viewerGender, preferredGender, user));
}

export function filterConnectableUsers(
  users: PresenceUser[],
  viewerGender: ProfileGender,
  preferredGender: ProfileGender
) {
  return users.filter((user) =>
    isUserConnectable(getUserAvailability(viewerGender, preferredGender, user))
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

export function filterVisibleUsersByGender(
  users: PresenceUser[],
  preferredGender: ProfileGender
) {
  return users.filter((user) => user.gender === preferredGender);
}

export type UserAvailability =
  | "connectable"
  | "also_in_conversation"
  | "waiting_profile";

export function getUserAvailability(
  viewerGender: ProfileGender,
  preferredGender: ProfileGender,
  user: PresenceUser
): UserAvailability {
  if (!isMutualMatch(viewerGender, preferredGender, user)) {
    return "waiting_profile";
  }

  if (user.inConversation) {
    return "also_in_conversation";
  }

  return "connectable";
}

export function isUserConnectable(availability: UserAvailability) {
  return availability === "connectable" || availability === "also_in_conversation";
}
