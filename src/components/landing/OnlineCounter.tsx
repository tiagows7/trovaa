"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getVisitorId } from "@/lib/visitor";

type OnlineCounterProps = {
  compact?: boolean;
};

export function OnlineCounter({ compact = false }: OnlineCounterProps) {
  const supabase = useMemo(() => createClient(), []);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const visitorId = getVisitorId();
    const channel = supabase.channel("trovaa:online", {
      config: { presence: { key: visitorId } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      setCount(Object.keys(state).length);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          online_at: new Date().toISOString(),
          page: "site",
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div
      className={
        compact
          ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-sm"
          : "inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
      }
    >
      <span className={`relative flex ${compact ? "h-2 w-2 sm:h-2.5 sm:w-2.5" : "h-2.5 w-2.5"}`}>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className={`relative inline-flex rounded-full bg-emerald-500 ${compact ? "h-2 w-2 sm:h-2.5 sm:w-2.5" : "h-2.5 w-2.5"}`} />
      </span>
      {count === null
        ? compact
          ? "..."
          : "Carregando..."
        : compact
          ? `${count} online`
          : `${count} online agora`}
    </div>
  );
}
