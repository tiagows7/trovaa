import type { RealtimeChannel } from "@supabase/supabase-js";
import type { ProfileGender } from "@/types/database";

export type StatePresenceTrack = {
  userId: string;
  gender: ProfileGender;
  lookingFor: ProfileGender | null;
  inConversation: boolean;
  isVip: boolean;
  stateCode: string;
};

export async function applyStateChannelTrack(
  channel: RealtimeChannel,
  track: StatePresenceTrack
) {
  const normalizedState = track.stateCode.toUpperCase();
  await channel.track({
    user_id: track.userId,
    gender: track.gender,
    looking_for: track.lookingFor,
    state_code: normalizedState,
    in_conversation: track.inConversation,
    is_vip: track.isVip,
  });
}

export function readStateChannelUsers(
  channel: RealtimeChannel,
  viewerUserId: string
) {
  type PresencePayload = {
    user_id?: string;
    gender?: ProfileGender;
    looking_for?: ProfileGender | null;
    in_conversation?: boolean;
    is_vip?: boolean;
  };

  const state = channel.presenceState<PresencePayload>();
  const byId = new Map<
    string,
    {
      userId: string;
      gender: ProfileGender;
      lookingFor: ProfileGender | null;
      inConversation: boolean;
      isVip: boolean;
    }
  >();

  for (const presences of Object.values(state)) {
    for (const presence of presences) {
      if (
        presence.user_id &&
        presence.gender &&
        presence.user_id !== viewerUserId
      ) {
        const inConversation = presence.in_conversation ?? false;
        const isVip = presence.is_vip ?? false;
        const existing = byId.get(presence.user_id);

        byId.set(presence.user_id, {
          userId: presence.user_id,
          gender: presence.gender,
          lookingFor: presence.looking_for ?? existing?.lookingFor ?? null,
          inConversation: existing?.inConversation || inConversation,
          isVip: existing?.isVip || isVip,
        });
      }
    }
  }

  return [...byId.values()];
}
