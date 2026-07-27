"use client";

import { useCallback, useEffect, useState } from "react";
import type { SessionDto, StandingRow } from "@/lib/types";

/**
 * Fetches a session plus its standings together and keeps them polled.
 * `getIntervalMs` is re-derived from the latest `session` on every render
 * (not stored in state) so the polling effect only actually resets when the
 * computed interval's value changes, not on every poll tick.
 */
export function useSessionData(id: string, getIntervalMs: (session: SessionDto | null) => number) {
  const [session, setSession] = useState<SessionDto | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);

  const refresh = useCallback(async () => {
    const [sRes, stRes] = await Promise.all([
      fetch(`/api/sessions/${id}`),
      fetch(`/api/sessions/${id}/standings`),
    ]);
    if (sRes.ok) setSession(await sRes.json());
    if (stRes.ok) setStandings(await stRes.json());
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const intervalMs = getIntervalMs(session);
  useEffect(() => {
    const interval = setInterval(refresh, intervalMs);
    return () => clearInterval(interval);
  }, [refresh, intervalMs]);

  return { session, standings, refresh };
}
