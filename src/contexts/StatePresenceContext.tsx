"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient, prepareSupabaseRealtimeAuth } from "@/lib/supabase/client";
import { useSupabaseRealtimeAuth } from "@/hooks/useSupabaseRealtimeAuth";
import type { ProfileGender } from "@/types/database";
import type { PresenceUser } from "@/hooks/useStatePresence";

type TrackPayload = {
  userId: string;
  gender: ProfileGender;
  lookingFor: ProfileGender | null;
  inConversation?: boolean;
  openToMatch?: boolean;
};

type StatePresenceContextValue = {
  getOnlineUsers: (stateCode: string, viewerUserId: string) => PresenceUser[];
  isStateLobbyReady: (stateCode: string) => boolean;
  updatePresence: (
    ownerKey: string,
    stateCode: string,
    payload: TrackPayload | null
  ) => void;
  clearPresence: () => Promise<void>;
  subscribePresenceSync: (listener: () => void) => () => void;
  presenceStatus: "idle" | "connecting" | "connected" | "error";
};

const StatePresenceContext = createContext<StatePresenceContextValue>({
  getOnlineUsers: () => [],
  isStateLobbyReady: () => false,
  updatePresence: () => {},
  clearPresence: async () => {},
  subscribePresenceSync: () => () => {},
  presenceStatus: "idle",
});

type PresencePayload = {
  user_id?: string;
  gender?: ProfileGender;
  looking_for?: ProfileGender | null;
  state_code?: string;
  in_conversation?: boolean;
};

function readOnlineUsers(
  channel: RealtimeChannel,
  viewerUserId: string
): PresenceUser[] {
  const state = channel.presenceState<PresencePayload>();
  const byId = new Map<string, PresenceUser>();

  for (const presences of Object.values(state)) {
    for (const presence of presences) {
      if (
        presence.user_id &&
        presence.gender &&
        presence.user_id !== viewerUserId
      ) {
        byId.set(presence.user_id, {
          userId: presence.user_id,
          gender: presence.gender,
          lookingFor: presence.looking_for ?? null,
          inConversation: presence.in_conversation ?? false,
        });
      }
    }
  }

  return Array.from(byId.values());
}

function mergeTrackPayload(
  owners: Map<string, TrackPayload>
): TrackPayload | null {
  const entries = [...owners.entries()];
  if (entries.length === 0) return null;

  const openToMatch = entries.some(([, entry]) => entry.openToMatch);

  const browsingEntry = entries.find(
    ([key, entry]) =>
      key.startsWith("match:") &&
      !entry.inConversation &&
      entry.lookingFor !== null
  );

  if (browsingEntry) {
    const [, payload] = browsingEntry;
    return {
      userId: payload.userId,
      gender: payload.gender,
      lookingFor: payload.lookingFor,
      inConversation: false,
    };
  }

  const base = entries[0][1];
  const lookingFor =
    entries.find(([, entry]) => entry.lookingFor !== null)?.[1].lookingFor ??
    null;

  return {
    userId: base.userId,
    gender: base.gender,
    lookingFor,
    inConversation: openToMatch
      ? false
      : entries.some(([, entry]) => entry.inConversation),
  };
}

function getActiveStateFromPath(pathname: string) {
  const chatMatch = pathname.match(/^\/chat\/([A-Za-z]{2})/);
  return chatMatch?.[1]?.toUpperCase() ?? null;
}

export function StatePresenceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const authReady = useSupabaseRealtimeAuth(supabase);
  const [presenceStatus, setPresenceStatus] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");
  const [readyStates, setReadyStates] = useState<Set<string>>(() => new Set());
  const [syncVersion, setSyncVersion] = useState(0);

  const channelsRef = useRef(new Map<string, RealtimeChannel>());
  const ownersByStateRef = useRef(new Map<string, Map<string, TrackPayload>>());
  const subscribedStatesRef = useRef(new Set<string>());
  const syncListenersRef = useRef(new Set<() => void>());
  const userIdRef = useRef("");
  const trackGenerationRef = useRef(0);
  const activeStateCodeRef = useRef<string | null>(null);
  const isActiveRouteRef = useRef(false);
  const untrackTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingChannelsRef = useRef(new Set<string>());
  const [userId, setUserId] = useState("");

  userIdRef.current = userId;

  const isActiveRoute =
    pathname.startsWith("/salas") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/conversa");

  isActiveRouteRef.current = isActiveRoute;

  const activeStateCode = getActiveStateFromPath(pathname);
  activeStateCodeRef.current = activeStateCode;

  const notifySync = useCallback(() => {
    setSyncVersion((value) => value + 1);
    for (const listener of syncListenersRef.current) {
      listener();
    }
  }, []);

  const markStateReady = useCallback((stateCode: string) => {
    const normalizedState = stateCode.toUpperCase();
    setReadyStates((current) => {
      if (current.has(normalizedState)) {
        return current;
      }

      const next = new Set(current);
      next.add(normalizedState);
      return next;
    });
  }, []);

  const cancelScheduledUntrack = useCallback((stateCode: string) => {
    const timer = untrackTimersRef.current.get(stateCode);
    if (timer) {
      clearTimeout(timer);
      untrackTimersRef.current.delete(stateCode);
    }
  }, []);

  const clearPresence = useCallback(async () => {
    trackGenerationRef.current += 1;

    for (const timer of untrackTimersRef.current.values()) {
      clearTimeout(timer);
    }
    untrackTimersRef.current.clear();

    const channels = new Map(channelsRef.current);
    const ownedStates = [...ownersByStateRef.current.keys()];

    ownersByStateRef.current.clear();

    for (const stateCode of ownedStates) {
      const channel = channels.get(stateCode);
      if (!channel) continue;

      try {
        await channel.untrack();
      } catch {
        // ignore untrack errors during teardown
      }
    }

    for (const channel of channels.values()) {
      try {
        await supabase.removeChannel(channel);
      } catch {
        // ignore remove errors during teardown
      }
    }

    channelsRef.current.clear();
    subscribedStatesRef.current.clear();
    setReadyStates(new Set());
    setPresenceStatus("idle");
    notifySync();
  }, [notifySync, supabase]);

  const applyTrack = useCallback(
    async (stateCode: string, attempt = 0) => {
      const generation = trackGenerationRef.current;
      const normalizedState = stateCode.toUpperCase();
      const channel = channelsRef.current.get(normalizedState);
      const owners = ownersByStateRef.current.get(normalizedState);
      const merged = owners ? mergeTrackPayload(owners) : null;

      if (!channel || !subscribedStatesRef.current.has(normalizedState)) {
        if (attempt < 12 && merged) {
          window.setTimeout(() => {
            void applyTrack(normalizedState, attempt + 1);
          }, 250 * (attempt + 1));
        }
        return;
      }

      if (!merged) {
        cancelScheduledUntrack(normalizedState);
        untrackTimersRef.current.set(
          normalizedState,
          setTimeout(() => {
            untrackTimersRef.current.delete(normalizedState);
            if (ownersByStateRef.current.get(normalizedState)?.size) {
              return;
            }

            const pendingChannel = channelsRef.current.get(normalizedState);
            if (!pendingChannel) return;

            void pendingChannel
              .untrack()
              .then(() => {
                if (generation === trackGenerationRef.current) {
                  notifySync();
                }
              })
              .catch(() => undefined);
          }, 500)
        );
        return;
      }

      cancelScheduledUntrack(normalizedState);

      try {
        await channel.track({
          user_id: merged.userId,
          gender: merged.gender,
          looking_for: merged.lookingFor,
          state_code: normalizedState,
          in_conversation: merged.inConversation ?? false,
        });
      } catch {
        if (attempt < 8) {
          window.setTimeout(() => {
            void applyTrack(normalizedState, attempt + 1);
          }, 400 * (attempt + 1));
        }
        return;
      }

      if (generation !== trackGenerationRef.current) {
        return;
      }

      notifySync();
    },
    [cancelScheduledUntrack, notifySync]
  );

  const applyAllOwnedTracks = useCallback(() => {
    for (const stateCode of ownersByStateRef.current.keys()) {
      void applyTrack(stateCode);
    }
  }, [applyTrack]);

  const scheduleTrackRetries = useCallback(
    (stateCode: string) => {
      for (const delay of [0, 500, 1500, 3000]) {
        window.setTimeout(() => {
          void applyTrack(stateCode);
          notifySync();
        }, delay);
      }
    },
    [applyTrack, notifySync]
  );

  const removeChannelForState = useCallback(
    async (normalizedState: string) => {
      pendingChannelsRef.current.delete(normalizedState);
      subscribedStatesRef.current.delete(normalizedState);

      const channel = channelsRef.current.get(normalizedState);
      if (!channel) return;

      channelsRef.current.delete(normalizedState);
      try {
        await channel.untrack();
      } catch {
        // ignore
      }
      try {
        await supabase.removeChannel(channel);
      } catch {
        // ignore
      }

      setReadyStates((current) => {
        if (!current.has(normalizedState)) return current;
        const next = new Set(current);
        next.delete(normalizedState);
        return next;
      });
    },
    [supabase]
  );

  const ensureChannel = useCallback(
    (stateCode: string, presenceKey: string) => {
      if (!presenceKey) {
        return null;
      }

      const normalizedState = stateCode.toUpperCase();
      const existing = channelsRef.current.get(normalizedState);

      if (existing && subscribedStatesRef.current.has(normalizedState)) {
        return existing;
      }

      if (existing) {
        void removeChannelForState(normalizedState);
      }

      if (pendingChannelsRef.current.has(normalizedState)) {
        return null;
      }

      pendingChannelsRef.current.add(normalizedState);
      setPresenceStatus("connecting");

      void (async () => {
        try {
          await prepareSupabaseRealtimeAuth(supabase);

          if (
            channelsRef.current.has(normalizedState) &&
            subscribedStatesRef.current.has(normalizedState)
          ) {
            return;
          }

          if (channelsRef.current.has(normalizedState)) {
            await removeChannelForState(normalizedState);
          }

          const channel = supabase.channel(`state:${normalizedState}`, {
            config: { presence: { key: presenceKey } },
          });

          channel.on("presence", { event: "sync" }, () => {
            notifySync();
          });
          channel.on("presence", { event: "join" }, () => {
            notifySync();
          });
          channel.on("presence", { event: "leave" }, () => {
            notifySync();
          });

          channelsRef.current.set(normalizedState, channel);

          channel.subscribe((status: string) => {
            if (status === "SUBSCRIBED") {
              pendingChannelsRef.current.delete(normalizedState);
              subscribedStatesRef.current.add(normalizedState);
              markStateReady(normalizedState);
              setPresenceStatus("connected");
              scheduleTrackRetries(normalizedState);
              return;
            }

            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              void removeChannelForState(normalizedState).then(() => {
                window.setTimeout(() => {
                  if (
                    isActiveRouteRef.current &&
                    (ownersByStateRef.current.has(normalizedState) ||
                      activeStateCodeRef.current === normalizedState)
                  ) {
                    ensureChannel(
                      normalizedState,
                      userIdRef.current || presenceKey
                    );
                  }
                }, 2000);
              });
            }
          });
        } catch {
          pendingChannelsRef.current.delete(normalizedState);
        }
      })();

      return null;
    },
    [
      markStateReady,
      notifySync,
      removeChannelForState,
      scheduleTrackRetries,
      supabase,
    ]
  );

  const bootstrapPresence = useCallback(() => {
    if (!isActiveRouteRef.current || ownersByStateRef.current.size === 0) {
      return;
    }

    let presenceKey = userIdRef.current;
    if (!presenceKey) {
      for (const owners of ownersByStateRef.current.values()) {
        for (const payload of owners.values()) {
          if (payload.userId) {
            presenceKey = payload.userId;
            break;
          }
        }
        if (presenceKey) break;
      }
    }

    if (!presenceKey) {
      return;
    }

    for (const stateCode of ownersByStateRef.current.keys()) {
      ensureChannel(stateCode, presenceKey);
      void applyTrack(stateCode);
    }
  }, [applyTrack, ensureChannel]);

  const isStateLobbyReady = useCallback(
    (stateCode: string) => readyStates.has(stateCode.toUpperCase()),
    [readyStates]
  );

  const updatePresence = useCallback(
    (ownerKey: string, stateCode: string, payload: TrackPayload | null) => {
      if (!stateCode || ownerKey.startsWith("match:")) {
        return;
      }

      const normalizedState = stateCode.toUpperCase();
      let owners =
        ownersByStateRef.current.get(normalizedState) ??
        new Map<string, TrackPayload>();

      if (payload) {
        owners.set(ownerKey, payload);
      } else {
        owners.delete(ownerKey);
      }

      if (owners.size === 0) {
        ownersByStateRef.current.delete(normalizedState);
      } else {
        ownersByStateRef.current.set(normalizedState, owners);
      }

      const presenceKey = payload?.userId ?? userIdRef.current;
      if (presenceKey && isActiveRouteRef.current) {
        ensureChannel(normalizedState, presenceKey);
      }

      void applyTrack(normalizedState);
    },
    [applyTrack, ensureChannel]
  );

  useEffect(() => {
    if (!isActiveRoute) {
      return;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        for (const stateCode of ownersByStateRef.current.keys()) {
          void applyTrack(stateCode);
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [applyTrack, isActiveRoute]);

  useEffect(() => {
    if (isActiveRoute) {
      return;
    }

    void clearPresence();
  }, [clearPresence, isActiveRoute]);

  useEffect(() => {
    let active = true;

    void supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      if (active) {
        setUserId(data.user?.id ?? "");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      const nextUserId = session?.user?.id ?? "";
      setUserId(nextUserId);

      if (event === "SIGNED_OUT" || !nextUserId) {
        void clearPresence();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [clearPresence, supabase]);

  useEffect(() => {
    if (!authReady || !isActiveRoute) {
      return;
    }

    void prepareSupabaseRealtimeAuth(supabase).then(() => {
      bootstrapPresence();
    });
  }, [authReady, bootstrapPresence, isActiveRoute, supabase]);

  useEffect(() => {
    if (!isActiveRoute || !userId) {
      return;
    }

    if (presenceStatus === "connected") {
      for (const stateCode of ownersByStateRef.current.keys()) {
        void applyTrack(stateCode);
      }
    }
  }, [applyTrack, isActiveRoute, presenceStatus, userId]);

  const getOnlineUsers = useCallback(
    (stateCode: string, viewerUserId: string) => {
      void syncVersion;
      const normalizedState = stateCode.toUpperCase();

      const presenceKey = userIdRef.current;
      if (presenceKey && isActiveRouteRef.current && ownersByStateRef.current.has(normalizedState)) {
        ensureChannel(normalizedState, presenceKey);
      }

      const channel = channelsRef.current.get(normalizedState);
      if (!channel) {
        return [];
      }

      if (!subscribedStatesRef.current.has(normalizedState)) {
        return [];
      }

      return readOnlineUsers(channel, viewerUserId);
    },
    [ensureChannel, syncVersion]
  );

  const subscribePresenceSync = useCallback((listener: () => void) => {
    syncListenersRef.current.add(listener);
    return () => {
      syncListenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo(
    () => ({
      getOnlineUsers,
      isStateLobbyReady,
      updatePresence,
      clearPresence,
      subscribePresenceSync,
      presenceStatus,
    }),
    [
      clearPresence,
      getOnlineUsers,
      isStateLobbyReady,
      updatePresence,
      subscribePresenceSync,
      presenceStatus,
    ]
  );

  return (
    <StatePresenceContext.Provider value={value}>
      {children}
    </StatePresenceContext.Provider>
  );
}

export function useStatePresenceContext() {
  return useContext(StatePresenceContext);
}
