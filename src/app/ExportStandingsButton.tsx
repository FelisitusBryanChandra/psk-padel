"use client";

import { useState } from "react";
import { shareStandingsImage } from "@/app/exportStandingsImage";
import type { StandingRow } from "@/lib/types";

export function ExportStandingsButton({
  rows,
  sortBy,
  scoreLabel,
  sessionName,
  sessionDate,
}: {
  rows: StandingRow[];
  sortBy: "sd" | "score";
  scoreLabel: string;
  sessionName: string;
  sessionDate?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      await shareStandingsImage({
        rows,
        sortBy,
        scoreLabel,
        sessionName,
        sessionDate,
      });
    } catch {
      setError("Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy || rows.length === 0}
      title={error ?? "Save the ranking as an image"}
      className="flex items-center gap-1.5 rounded-full border border-outline px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-ink-muted transition-colors hover:border-lime hover:text-ink disabled:opacity-40 disabled:hover:border-outline disabled:hover:text-ink-muted"
    >
      <span className="material-symbols-outlined text-[14px] leading-none">
        {error ? "error" : "ios_share"}
      </span>
      {busy ? "Saving…" : (error ?? "Export")}
    </button>
  );
}
