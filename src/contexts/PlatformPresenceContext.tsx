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
import { createClient } from "@/lib/supabase/client";
import { useSupabaseRealtimeAuth } from "@/hooks/useSupabaseRealtimeAuth";

const PLATFORM_PRESENCE_CHANNEL = "platform:online";

type PlatformPresenceContextValue = {
  onlineUsers: Map<string, string | null>;
  countsByState: Map<string, number>;
  reportLobbyState: (ownerKey: string, stateCode: string | null) => void;
};

const PlatformPresenceContext = createContext<PlatformPresenceContextValue>({
  onlineUsers: new Map(),
  countsByState: new Map(),
  reportLobbyState: () => {},
});

function getActiveStateFromPath(pathname: string) {
  const chatMatch = pathname.match(/^\/chat\/([A-Za-z]{2})/);
  return chatMatch?.[1]?.toUpperCase() ?? null;
}

function mergeLobbyState(
  owners: Map<string, string | null>,
  pathnameState: string | null
) {
  const conversaState = [...owners.entries()].find(([key, state]) =>
    (key.startsWith("conversa:") ||
      key.startsWith("route:") ||
      key.startsWith("layout:")) &&
    state
  )?.[1];

  if (conversaState) {
    return conversaState;
  }

  const matchState = [...owners.entries()].find(([key, state]) =>
    key.startsWith("match:") && state
  )?.[1];

  if (matchState) {
    return matchState;
  }

  return pathnameState;
}

export function PlatformPresenceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const authReady = useSupabaseRealtimeAuth(supabase);
  const [userId, setUserId] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<Map<string, string | null>>(
    new Map()
  );
  const [lobbyStateVersion, setLobbyStateVersion] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const userIdRef = useRef("");
  const lobbyStateOwnersRef = useRef(new Map<string, string | null>());

  const pathnameState = useMemo(
    () => getActiveStateFromPath(pathname),
    [pathname]
  );
  const isActiveRoute =
    pathname.startsWith("/salas") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/conversa");

  userIdRef.current = userId;

  const reportLobbyState = useCallback(
    (ownerKey: string, stateCode: string | null) => {
      const normalizedState = stateCode?.toUpperCase() ?? null;

      if (normalizedState) {
        lobbyStateOwnersRef.current.set(ownerKey, normalizedState);
      } else {
        lobbyStateOwnersRef.current.delete(ownerKey);
      }

      setLobbyStateVersion((value) => value + 1);
    },
    []
  );

  const syncOnlineUsers = useCallback((currentChannel: RealtimeChannel) => {
    const presenceState = currentChannel.presenceState<{
      user_id?: string;
      state_code?: string | null;
    }>();
    const next = new Map<string, string | null>();
    const viewerId = userIdRef.current;

    for (const presences of Object.values(presenceState)) {
      for (const presence of presences) {
        if (presence.user_id && presence.user_id !== viewerId) {
          next.set(presence.user_id, presence.state_code ?? null);
        }
      }
    }

    setOnlineUsers(next);
  }, []);

  const applyPlatformTrack = useCallback(async () => {
    const channel = channelRef.current;
    if (!channel || !subscribedRef.current || !userIdRef.current) {
      return;
    }

    const stateCode = mergeLobbyState(
      lobbyStateOwnersRef.current,
      pathnameState
    );

    try {
      await channel.track({
        user_id: userIdRef.current,
        state_code: stateCode,
      });
      syncOnlineUsers(channel);
    } catch {
      // channel may be tearing down
    }
  }, [pathnameState, syncOnlineUsers]);

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
      setUserId(session?.user?.id ?? "");
      if (event === "SIGNED_OUT" || !session?.user) {
        lobbyStateOwnersRef.current.clear();
        setOnlineUsers(new Map());
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!authReady || !userId || !isActiveRoute) {
      subscribedRef.current = false;
      if (channelRef.current) {
        void channelRef.current.untrack().catch(() => undefined);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setOnlineUsers(new Map());
      return;
    }

    let active = true;

    const channel = supabase.channel(PLATFORM_PRESENCE_CHANNEL, {
      config: { presence: { key: userId } },
    });

    channel.on("presence", { event: "sync" }, () => {
      syncOnlineUsers(channel);
    });
    channel.on("presence", { event: "join" }, () => {
      syncOnlineUsers(channel);
    });
    channel.on("presence", { event: "leave" }, () => {
      syncOnlineUsers(channel);
    });

    channel.subscribe((status: string) => {
      if (!active) return;

      if (status === "SUBSCRIBED") {
        subscribedRef.current = true;
        void applyPlatformTrack();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        subscribedRef.current = false;
      }
    });

    channelRef.current = channel;

    return () => {
      active = false;
      subscribedRef.current = false;
      void channel.untrack().catch(() => undefined);
      supabase.removeChannel(channel);
      if (channelRef.current === channel) {
        channelRef.current = null;
      }
      setOnlineUsers(new Map());
    };
  }, [applyPlatformTrack, authReady, isActiveRoute, supabase, syncOnlineUsers, userId]);

  useEffect(() => {
    void lobbyStateVersion;
    void applyPlatformTrack();
  }, [applyPlatformTrack, lobbyStateVersion, pathnameState]);

  const value = useMemo(() => {
    const countsByState = new Map<string, number>();

    for (const code of onlineUsers.values()) {
      if (code) {
        countsByState.set(code, (countsByState.get(code) ?? 0) + 1);
      }
    }

    return { onlineUsers, countsByState, reportLobbyState };
  }, [onlineUsers, reportLobbyState]);

  return (
    <PlatformPresenceContext.Provider value={value}>
      {children}
    </PlatformPresenceContext.Provider>
  );
}

export function usePlatformPresence() {
  return useContext(PlatformPresenceContext);
}

export function isSavedContactOnline(
  onlineUsers: Map<string, string | null>,
  savedUserId: string
) {
  return onlineUsers.has(savedUserId);
}

export function getSavedContactOnlineState(
  onlineUsers: Map<string, string | null>,
  savedUserId: string
) {
  return onlineUsers.get(savedUserId) ?? null;
}

export function getStateLobbyCount(
  countsByState: Map<string, number>,
  stateCode: string
) {
  return countsByState.get(stateCode.toUpperCase()) ?? 0;
}
