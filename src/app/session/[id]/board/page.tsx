"use client";

import { use, useState } from "react";
import { StandingsTable } from "@/app/StandingsTable";
import { SortToggle } from "@/app/SortToggle";
import { useSessionData } from "@/app/useSessionData";
import { Logo } from "@/app/Logo";

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { session, standings } = useSessionData(id, () => 5000);
  const [sortBy, setSortBy] = useState<"sd" | "score">("sd");

  const liveMatches = (session?.rounds ?? []).flatMap((r) =>
    r.matches.filter((m) => !m.completed)
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col bg-bg px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <Logo className="h-9 w-auto text-lime" />
        <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-ink">
          {session?.name || "PSK Padel"}
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
                {session?.scoringMode === "SET"
                  ? `${m.team1Games}–${m.team2Games}`
                  : `${m.team1Score}–${m.team2Score}`}
              </div>
            </div>
          ))}
        </div>
      )}

      <SortToggle sortBy={sortBy} onChange={setSortBy} />

      <StandingsTable
        rows={standings}
        sortBy={sortBy}
        scoreLabel={session?.scoringMode === "SET" ? "Games" : "Score"}
      />
    </main>
  );
}
