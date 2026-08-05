"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getVisitorId } from "@/lib/visitor";

const SESSION_VISIT_KEY = "trovaa-visit-recorded";

export function SiteVisitTracker() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_VISIT_KEY)) return;

    const visitorKey = getVisitorId();
    if (!visitorKey) return;

    void supabase
      .rpc("record_site_visit", {
        p_visitor_key: visitorKey,
        p_path: pathname || "/",
      })
      .then(({ data, error }) => {
        const recorded = (data as { recorded?: boolean } | null)?.recorded === true;
        if (!error && recorded) {
          sessionStorage.setItem(SESSION_VISIT_KEY, "1");
        }
      });
  }, [pathname, supabase]);

  return null;
}
