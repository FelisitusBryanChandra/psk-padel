"use client";

import { use, useCallback, useEffect, useState } from "react";
import { StandingsTable } from "../page";
import type { RoundDto, StandingRow } from "@/lib/types";

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [name, setName] = useState("");
  const [rounds, setRounds] = useState<RoundDto[]>([]);
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [sortBy, setSortBy] = useState<"sd" | "score">("sd");

  const refresh = useCallback(async () => {
    const [sRes, stRes] = await Promise.all([
      fetch(`/api/sessions/${id}`),
      fetch(`/api/sessions/${id}/standings`),
    ]);
    if (sRes.ok) {
      const data = await sRes.json();
      setName(data.name);
      setRounds(data.rounds);
    }
    if (stRes.ok) setRows(await stRes.json());
  }, [id]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const liveMatches = rounds.flatMap((r) => r.matches.filter((m) => !m.completed));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col bg-bg px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <span className="material-symbols-outlined text-4xl text-lime">sports_tennis</span>
        <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-ink">
          {name || "PSK Padel"}
        </h1>
        <p className="text-xs font-black uppercase tracking-widest text-ink-muted/60">
          Live Leaderboard
        </p>
      </div>

      {liveMatches.length > 0 && (
        <div className="mb-8 flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-live">
            <span className="h-2 w-2 animate-pulse rounded-full bg-live" />
            Now Playing
          </h2>
          {liveMatches.map((m) => (
            <div
              key={m.id}
              className="glass flex items-center justify-between rounded-xl px-4 py-3"
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
                  Court {m.courtNumber}
                </p>
                <p className="text-sm text-ink">
                  {m.team1Player1.name} &amp; {m.team1Player2.name}
                  <span className="mx-1 italic text-ink-muted">vs</span>
                  {m.team2Player1.name} &amp; {m.team2Player2.name}
                </p>
              </div>
              <div className="font-heading text-xl font-black tabular-nums text-lime">
                {m.team1Score}&ndash;{m.team2Score}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <label className="flex items-center gap-2">
          <span
            className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
              sortBy === "score" ? "text-ink" : "text-ink-muted"
            }`}
          >
            Score
          </span>
          <span className="sort-toggle">
            <input
              type="checkbox"
              className="sort-toggle-input"
              checked={sortBy === "sd"}
              onChange={(e) => setSortBy(e.target.checked ? "sd" : "score")}
            />
            <span className="sort-toggle-indicator" />
          </span>
          <span
            className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
              sortBy === "sd" ? "text-ink" : "text-ink-muted"
            }`}
          >
            SD
          </span>
        </label>
      </div>

      <StandingsTable rows={rows} sortBy={sortBy} />
    </main>
  );
}
