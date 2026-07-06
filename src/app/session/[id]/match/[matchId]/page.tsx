"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cycleServe, nextServeState, servingPlayerId, type ServeState } from "@/lib/serve";

type PlayerRef = { id: string; name: string };

type MatchDto = {
  id: string;
  courtNumber: number;
  team1Player1: PlayerRef;
  team1Player2: PlayerRef;
  team2Player1: PlayerRef;
  team2Player2: PlayerRef;
  team1Score: number;
  team2Score: number;
  completed: boolean;
  servingTeam: number;
  team1ServerSlot: number;
  team2ServerSlot: number;
};

export default function ScoreboardPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const { id, matchId } = use(params);
  const router = useRouter();

  const [match, setMatch] = useState<MatchDto | null>(null);
  const [pointsPerServe, setPointsPerServe] = useState(5);
  const [live, setLive] = useState<{ team1Score: number; team2Score: number } & ServeState>({
    team1Score: 0,
    team2Score: 0,
    servingTeam: 1,
    team1ServerSlot: 1,
    team2ServerSlot: 1,
  });
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    fetch(`/api/sessions/${id}`)
      .then((r) => r.json())
      .then((session) => {
        setPointsPerServe(session.pointsPerServe);
        const found: MatchDto | undefined = session.rounds
          .flatMap((r: { matches: MatchDto[] }) => r.matches)
          .find((m: MatchDto) => m.id === matchId);
        if (found) {
          setMatch(found);
          setLive({
            team1Score: found.team1Score,
            team2Score: found.team2Score,
            servingTeam: found.servingTeam,
            team1ServerSlot: found.team1ServerSlot,
            team2ServerSlot: found.team2ServerSlot,
          });
        }
      });
  }, [id, matchId]);

  function adjust(team: 1 | 2, delta: 1 | -1) {
    setLive((prev) => {
      const team1Score = team === 1 ? Math.max(0, prev.team1Score + delta) : prev.team1Score;
      const team2Score = team === 2 ? Math.max(0, prev.team2Score + delta) : prev.team2Score;
      const prevTotal = prev.team1Score + prev.team2Score;
      const newTotal = team1Score + team2Score;
      const serve = nextServeState(prev, prevTotal, newTotal, pointsPerServe);
      return { team1Score, team2Score, ...serve };
    });
  }

  async function finish() {
    if (!match) return;
    setFinishing(true);
    await fetch(`/api/matches/${match.id}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team1Score: live.team1Score, team2Score: live.team2Score }),
    });
    router.push(`/session/${id}`);
  }

  if (!match) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-bg text-ink-muted">
        Loading...
      </main>
    );
  }

  if (match.completed) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-lime-dim">
          This match is already finished
        </p>
        <p className="font-heading text-4xl font-black text-ink">
          {match.team1Score}&ndash;{match.team2Score}
        </p>
        <button
          onClick={() => router.push(`/session/${id}`)}
          className="rounded-full border border-outline px-4 py-2 text-xs font-black uppercase tracking-widest text-ink-muted"
        >
          Back
        </button>
      </main>
    );
  }

  const server = servingPlayerId(live, {
    team1Player1Id: match.team1Player1.id,
    team1Player2Id: match.team1Player2.id,
    team2Player1Id: match.team2Player1.id,
    team2Player2Id: match.team2Player2.id,
  });

  return (
    <main className="landscape-force flex min-h-dvh flex-col bg-bg px-6 py-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-ink-muted">
          <span className="material-symbols-outlined text-base">location_on</span>
          Court {match.courtNumber}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-live-bg/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-live">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
          Live
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center gap-8">
        <TeamPanel
          name={`${match.team1Player1.name} & ${match.team1Player2.name}`}
          score={live.team1Score}
          serving={server === match.team1Player1.id || server === match.team1Player2.id}
          onServe={() => setLive((prev) => ({ ...prev, ...cycleServe(prev) }))}
          onAdjust={(d) => adjust(1, d)}
        />
        <div className="h-32 w-px bg-outline/30" />
        <TeamPanel
          name={`${match.team2Player1.name} & ${match.team2Player2.name}`}
          score={live.team2Score}
          serving={server === match.team2Player1.id || server === match.team2Player2.id}
          onServe={() => setLive((prev) => ({ ...prev, ...cycleServe(prev) }))}
          onAdjust={(d) => adjust(2, d)}
        />
      </div>

      <button
        onClick={finish}
        disabled={finishing}
        className="mb-2 w-full rounded-xl bg-live py-4 font-heading text-base font-black uppercase tracking-wide text-white shadow-lg active:scale-[0.98] transition-transform disabled:opacity-40"
      >
        {finishing ? "Saving..." : "Finish Match"}
      </button>
    </main>
  );
}

function TeamPanel({
  name,
  score,
  serving,
  onServe,
  onAdjust,
}: {
  name: string;
  score: number;
  serving: boolean;
  onServe: () => void;
  onAdjust: (delta: 1 | -1) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <button onClick={onServe} aria-label="Switch serve to this side">
        <span
          className={`material-symbols-outlined flex h-10 w-10 items-center justify-center rounded-full text-xl transition-colors ${
            serving ? "bg-lime text-on-lime" : "bg-surface-highest text-outline"
          }`}
        >
          sports_tennis
        </span>
      </button>
      <p className="max-w-[10rem] text-center text-sm font-bold uppercase tracking-wide text-ink">
        {name}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onAdjust(-1)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-highest text-ink-muted active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined">remove</span>
        </button>
        <span className="w-24 text-center font-heading text-6xl font-black tabular-nums text-lime">
          {score}
        </span>
        <button
          onClick={() => onAdjust(1)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-lime text-on-lime shadow-md shadow-lime/20 active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>
    </div>
  );
}
