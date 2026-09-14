"use client";

import { use, useCallback, useEffect, useState } from "react";
import { Logo } from "@/app/Logo";
import { computeMatchTitle } from "@/lib/matchTitle";
import { courtLabel, type PlayerRef } from "@/lib/types";

type ViewMatch = {
  id: string;
  courtNumber: number;
  team1Player1: PlayerRef;
  team1Player2: PlayerRef;
  team2Player1: PlayerRef;
  team2Player2: PlayerRef;
  team1Score: number;
  team2Score: number;
  team1Games: number;
  team2Games: number;
  completed: boolean;
  servingTeam: number;
  team1ServerSlot: number;
  team2ServerSlot: number;
};

type ViewRound = { id: string; roundNumber: number; matches: ViewMatch[] };

type ViewSession = {
  name: string;
  venueName: string | null;
  courtNames: string[];
  scoringMode: "POINTS" | "SET";
  pointsPerMatch: number;
  gamesPerSet: number;
  rounds: ViewRound[];
};

function servingPlayer(m: ViewMatch): PlayerRef {
  if (m.servingTeam === 1) {
    return m.team1ServerSlot === 1 ? m.team1Player1 : m.team1Player2;
  }
  return m.team2ServerSlot === 1 ? m.team2Player1 : m.team2Player2;
}

// No-login, read-only counterpart of the Matches tab: same round/matchup/
// score view, nothing that mutates state (no edit, reshuffle, rebalance,
// or session controls), and no app chrome -- this is the whole page.
export default function PublicMatchesViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [session, setSession] = useState<ViewSession | null>(null);
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/public/sessions/${id}/matches`);
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    if (res.ok) setSession(await res.json());
  }, [id]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (notFound) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-ink-muted">Session not found.</p>
      </main>
    );
  }

  if (!session) {
    return <main className="flex min-h-dvh flex-col items-center justify-center" />;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 py-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <Logo className="h-9 w-auto text-lime" />
        <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-ink">
          {session.name}
        </h1>
        {session.venueName && <p className="text-xs text-ink-muted">{session.venueName}</p>}
      </div>

      {session.rounds.map((round) => (
        <section key={round.id} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-lg font-bold text-ink">Round {round.roundNumber}</h2>
            <div className="h-px flex-1 bg-outline/30" />
          </div>
          <div className="flex flex-col gap-3">
            {round.matches.map((m) => {
              const server = servingPlayer(m);
              const title = m.completed
                ? computeMatchTitle(
                    session.scoringMode,
                    session.scoringMode === "SET" ? m.team1Games : m.team1Score,
                    session.scoringMode === "SET" ? m.team2Games : m.team2Score,
                    session.scoringMode === "SET" ? session.gamesPerSet : session.pointsPerMatch
                  )
                : null;
              return (
                <div key={m.id} className="glass overflow-hidden rounded-xl">
                  <div className="flex items-start justify-between p-4">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
                          {courtLabel(session, m.courtNumber)}
                        </span>
                        {!m.completed && (
                          <span className="flex items-center gap-1 rounded-full bg-live-bg/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-live">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
                            Live
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-tight text-ink">
                        {m.team1Player1.name} &amp; {m.team1Player2.name}
                        <span className="mx-1 italic text-ink-muted">vs</span>
                        {m.team2Player1.name} &amp; {m.team2Player2.name}
                      </p>
                      {!m.completed && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-lime">
                          <span className="material-symbols-outlined text-sm">sports_tennis</span>
                          Serving: {server.name}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="font-heading text-2xl font-black tabular-nums text-lime">
                        {session.scoringMode === "SET"
                          ? `${m.team1Games}–${m.team2Games}`
                          : `${m.team1Score}–${m.team2Score}`}
                      </p>
                      {title && (
                        <span className="rounded-full bg-live-bg/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-live">
                          {title}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
