"use client";

import { useEffect, useRef } from "react";
import {
  leaveMatchLobbyPresence,
  publishMatchLobbyPresence,
} from "@/lib/match-lobby-presence";
import type { StatePresenceTrack } from "@/lib/state-presence-utils";

export type { StatePresenceTrack } from "@/lib/state-presence-utils";
export {
  applyStateChannelTrack,
  readStateChannelUsers,
} from "@/lib/state-presence-utils";

export function useStateChannelTracker(
  track: StatePresenceTrack | null,
  options?: { onSync?: () => void }
) {
  const trackRef = useRef(track);
  trackRef.current = track;
  const onSyncRef = useRef(options?.onSync);
  onSyncRef.current = options?.onSync;

  useEffect(() => {
    if (!track) {
      return;
    }

    let active = true;

    async function sync() {
      const current = trackRef.current;
      if (!active || !current) return;

      try {
        await publishMatchLobbyPresence({
          stateCode: current.stateCode,
          gender: current.gender,
          lookingFor: current.lookingFor,
          inConversation: current.inConversation,
          isVip: current.isVip,
        });
        onSyncRef.current?.();
      } catch {
        // heartbeat retry on next interval
      }
    }

    void sync();

    const interval = window.setInterval(() => {
      void sync();
    }, 5000);

    return () => {
      active = false;
      clearInterval(interval);
      void leaveMatchLobbyPresence();
    };
  }, [
    track?.gender,
    track?.inConversation,
    track?.isVip,
    track?.lookingFor,
    track?.stateCode,
    track?.userId,
  ]);
}
