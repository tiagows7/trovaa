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
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getDisplayName } from "@/lib/anonymous-names";
import { getStateByCode } from "@/lib/brazil-states";
import { useUserProfileRoles } from "@/hooks/useUserProfileRoles";
import {
  acceptConnection,
  cancelConnectionRequest,
  declineConnection,
  fetchConnectionRequestById,
  fetchPendingIncomingRequest,
  fetchPendingOutgoingRequest,
  mapConnectionRequest,
  type ConnectionRequest,
} from "@/lib/connection-requests";
import { playNotificationBeep } from "@/lib/notification-sound";
import { useConversationTabs } from "@/contexts/ConversationTabsContext";

type ConnectionRequestsContextValue = {
  ready: boolean;
  userId: string;
  incomingRequest: ConnectionRequest | null;
  outgoingRequest: ConnectionRequest | null;
  requesterName: string;
  targetName: string;
  incomingStateName: string | null;
  actingOnRequestId: string | null;
  acceptIncoming: () => Promise<void>;
  declineIncoming: () => Promise<void>;
  cancelOutgoing: () => Promise<void>;
  refreshRequests: () => Promise<void>;
};

const ConnectionRequestsContext =
  createContext<ConnectionRequestsContextValue | null>(null);

export function ConnectionRequestsProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const { openConversationById } = useConversationTabs();
  const { isVip: viewerIsVip } = useUserProfileRoles();
  const [userId, setUserId] = useState("");
  const [ready, setReady] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState<ConnectionRequest | null>(
    null
  );
  const [outgoingRequest, setOutgoingRequest] = useState<ConnectionRequest | null>(
    null
  );
  const [requesterName, setRequesterName] = useState("Alguém");
  const [targetName, setTargetName] = useState("Usuário");
  const [actingOnRequestId, setActingOnRequestId] = useState<string | null>(null);

  const viewerIsVipRef = useRef(viewerIsVip);
  const openConversationByIdRef = useRef(openConversationById);
  const outgoingRequestRef = useRef<ConnectionRequest | null>(null);
  const openedConversationsRef = useRef(new Set<string>());

  viewerIsVipRef.current = viewerIsVip;
  openConversationByIdRef.current = openConversationById;
  outgoingRequestRef.current = outgoingRequest;

  useEffect(() => {
    let active = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUserId(data.user?.id ?? "");
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? "");
      setReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleAcceptedConnection = useCallback(async (conversationId: string) => {
    if (!conversationId || openedConversationsRef.current.has(conversationId)) {
      return;
    }

    const opened = await openConversationByIdRef.current(conversationId);
    if (opened) {
      openedConversationsRef.current.add(conversationId);
    }
  }, []);

  const refreshRequests = useCallback(async () => {
    if (!userId) return;

    const previousOutgoing = outgoingRequestRef.current;

    const [incoming, outgoing] = await Promise.all([
      fetchPendingIncomingRequest(supabase, userId),
      fetchPendingOutgoingRequest(supabase, userId),
    ]);

    if (
      previousOutgoing &&
      !outgoing &&
      previousOutgoing.status === "pending"
    ) {
      const resolved = await fetchConnectionRequestById(
        supabase,
        previousOutgoing.id
      );

      if (
        resolved?.status === "accepted" &&
        resolved.conversationId
      ) {
        await handleAcceptedConnection(resolved.conversationId);
      }
    }

    setIncomingRequest(incoming);
    setOutgoingRequest(outgoing);

    const profileIds = [incoming?.requesterId, outgoing?.targetId].filter(
      (value): value is string => Boolean(value)
    );

    if (profileIds.length === 0) return;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", profileIds);

    const usernameById = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile.username])
    );

    if (incoming) {
      setRequesterName(
        getDisplayName(
          incoming.requesterId,
          usernameById.get(incoming.requesterId),
          viewerIsVipRef.current
        )
      );
    }

    if (outgoing) {
      setTargetName(
        getDisplayName(
          outgoing.targetId,
          usernameById.get(outgoing.targetId),
          viewerIsVipRef.current
        )
      );
    }
  }, [handleAcceptedConnection, supabase, userId]);

  const refreshRequestsRef = useRef(refreshRequests);
  refreshRequestsRef.current = refreshRequests;

  const handleAcceptedConnectionRef = useRef(handleAcceptedConnection);
  handleAcceptedConnectionRef.current = handleAcceptedConnection;

  useEffect(() => {
    if (!ready || !userId) {
      setIncomingRequest(null);
      setOutgoingRequest(null);
      return;
    }

    let active = true;
    const channelName = `connection-requests:${userId}`;

    void refreshRequestsRef.current();

    const channel = supabase.channel(channelName);

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "connection_requests",
        filter: `requester_id=eq.${userId}`,
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const row = (payload.new ?? payload.old) as Record<string, unknown> | null;
        if (!row?.id) return;

        const request = mapConnectionRequest(
          row as Parameters<typeof mapConnectionRequest>[0]
        );

        if (request.requesterId !== userId) return;

        if (request.status === "pending") {
          setOutgoingRequest(request);
          return;
        }

        setOutgoingRequest((current) =>
          current?.id === request.id ? null : current
        );

        if (
          request.status === "accepted" &&
          request.conversationId &&
          payload.eventType !== "DELETE"
        ) {
          void handleAcceptedConnectionRef.current(request.conversationId);
        }
      }
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "connection_requests",
        filter: `target_id=eq.${userId}`,
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const row = (payload.new ?? payload.old) as Record<string, unknown> | null;
        if (!row?.id) return;

        const request = mapConnectionRequest(
          row as Parameters<typeof mapConnectionRequest>[0]
        );

        if (request.targetId !== userId) return;

        if (request.status === "pending") {
          if (payload.eventType === "INSERT") {
            playNotificationBeep("connection");
          }
          setIncomingRequest(request);
          if (active) {
            void refreshRequestsRef.current();
          }
          return;
        }

        setIncomingRequest((current) =>
          current?.id === request.id ? null : current
        );
      }
    );

    channel.subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [ready, supabase, userId]);

  useEffect(() => {
    if (!outgoingRequest) return;

    const interval = window.setInterval(() => {
      void refreshRequestsRef.current();
    }, 2000);

    return () => {
      window.clearInterval(interval);
    };
  }, [outgoingRequest?.id]);

  const acceptIncoming = useCallback(async () => {
    if (!incomingRequest) return;

    setActingOnRequestId(incomingRequest.id);

    try {
      const conversationId = await acceptConnection(supabase, incomingRequest.id);
      setIncomingRequest(null);
      await handleAcceptedConnection(conversationId);
    } finally {
      setActingOnRequestId(null);
    }
  }, [handleAcceptedConnection, incomingRequest, supabase]);

  const declineIncoming = useCallback(async () => {
    if (!incomingRequest) return;

    setActingOnRequestId(incomingRequest.id);

    try {
      await declineConnection(supabase, incomingRequest.id);
      setIncomingRequest(null);
    } finally {
      setActingOnRequestId(null);
    }
  }, [incomingRequest, supabase]);

  const cancelOutgoing = useCallback(async () => {
    if (!outgoingRequest) return;

    setActingOnRequestId(outgoingRequest.id);

    try {
      await cancelConnectionRequest(supabase, outgoingRequest.id);
      setOutgoingRequest(null);
    } finally {
      setActingOnRequestId(null);
    }
  }, [outgoingRequest, supabase]);

  const incomingStateName = incomingRequest
    ? (getStateByCode(incomingRequest.stateCode)?.name ?? incomingRequest.stateCode)
    : null;

  const value = useMemo(
    () => ({
      ready,
      userId,
      incomingRequest,
      outgoingRequest,
      requesterName,
      targetName,
      incomingStateName,
      actingOnRequestId,
      acceptIncoming,
      declineIncoming,
      cancelOutgoing,
      refreshRequests,
    }),
    [
      ready,
      userId,
      incomingRequest,
      outgoingRequest,
      requesterName,
      targetName,
      incomingStateName,
      actingOnRequestId,
      acceptIncoming,
      declineIncoming,
      cancelOutgoing,
      refreshRequests,
    ]
  );

  return (
    <ConnectionRequestsContext.Provider value={value}>
      {children}
    </ConnectionRequestsContext.Provider>
  );
}

export function useConnectionRequests() {
  const context = useContext(ConnectionRequestsContext);
  if (!context) {
    throw new Error(
      "useConnectionRequests deve ser usado dentro de ConnectionRequestsProvider"
    );
  }
  return context;
}
