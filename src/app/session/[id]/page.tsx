"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";

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

type RoundDto = { id: string; roundNumber: number; matches: MatchDto[] };

type SessionDto = {
  id: string;
  name: string;
  courts: number;
  pointsPerMatch: number;
  pointsPerServe: number;
  players: { player: PlayerRef }[];
  rounds: RoundDto[];
};

type StandingRow = {
  playerId: string;
  name: string;
  played: number;
  wins: number;
  ties: number;
  losses: number;
  sd: number;
  missedRounds: number;
  mBonus: number;
  score: number;
};

function servingPlayer(m: MatchDto): PlayerRef {
  if (m.servingTeam === 1) {
    return m.team1ServerSlot === 1 ? m.team1Player1 : m.team1Player2;
  }
  return m.team2ServerSlot === 1 ? m.team2Player1 : m.team2Player2;
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [session, setSession] = useState<SessionDto | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [tab, setTab] = useState<"matches" | "standings">("matches");
  const [sortBy, setSortBy] = useState<"sd" | "score">("sd");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const hasLive = session?.rounds
    .at(-1)
    ?.matches.some((m) => !m.completed);

  const hasIncomplete = session?.rounds.some((r) => r.matches.some((m) => !m.completed));

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

  useEffect(() => {
    const interval = setInterval(refresh, hasLive ? 3000 : 15000);
    return () => clearInterval(interval);
  }, [refresh, hasLive]);

  async function adjustScore(matchId: string, team: 1 | 2, delta: 1 | -1) {
    await fetch(`/api/matches/${matchId}/score`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team, delta }),
    });
    refresh();
  }

  async function setScore(matchId: string, team: 1 | 2, value: number) {
    await fetch(`/api/matches/${matchId}/score`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team, value }),
    });
    refresh();
  }

  async function switchServe(matchId: string) {
    await fetch(`/api/matches/${matchId}/serve`, { method: "POST" });
    refresh();
  }

  async function finishMatch(matchId: string) {
    await fetch(`/api/matches/${matchId}/finish`, { method: "POST" });
    setExpanded(null);
    refresh();
  }

  async function generateRound() {
    setGenerating(true);
    await fetch(`/api/sessions/${id}/rounds`, { method: "POST" });
    setGenerating(false);
    refresh();
  }

  async function endSession() {
    if (
      !confirm(
        "End this session? Any match still in progress gets locked in at its current score, and rounds that never started are removed."
      )
    ) {
      return;
    }
    await fetch(`/api/sessions/${id}/end`, { method: "POST" });
    refresh();
  }

  if (!session) {
    return (
      <main className="flex flex-1 items-center justify-center bg-bg text-ink-muted">
        Loading...
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col bg-bg pb-24">
      <header className="sticky top-0 z-10 bg-bg px-5 py-4">
        <div className="mb-3 flex items-center gap-3">
          <Link href="/" className="material-symbols-outlined text-ink">
            arrow_back
          </Link>
          <div className="flex-1">
            <h1 className="font-heading text-lg font-black text-ink">{session.name}</h1>
            <p className="text-xs text-ink-muted">
              {session.players.length} players &middot; {session.courts} court
              {session.courts > 1 ? "s" : ""} &middot; to {session.pointsPerMatch}, serve/
              {session.pointsPerServe}
            </p>
          </div>
          {hasIncomplete && (
            <button
              onClick={endSession}
              className="whitespace-nowrap rounded-full border border-outline px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-ink-muted"
            >
              End Session
            </button>
          )}
        </div>

        <div className="flex items-center justify-between border-b border-outline/30 pb-2">
          <div className="flex gap-4">
            <button
              onClick={() => setTab("matches")}
              className={`text-xs font-black uppercase tracking-widest pb-2 px-1 border-b-2 ${
                tab === "matches"
                  ? "border-lime text-lime"
                  : "border-transparent text-ink-muted"
              }`}
            >
              Matches
            </button>
            <button
              onClick={() => setTab("standings")}
              className={`text-xs font-black uppercase tracking-widest pb-2 px-1 border-b-2 ${
                tab === "standings"
                  ? "border-lime text-lime"
                  : "border-transparent text-ink-muted"
              }`}
            >
              Standings
            </button>
          </div>
          <Link
            href={`/session/${id}/board`}
            target="_blank"
            className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-lime-dim"
          >
            <span className="material-symbols-outlined text-sm">tv</span>
            TV Board
          </Link>
        </div>
      </header>

      {tab === "matches" && (
        <div className="flex flex-col gap-6 px-5 pt-4">
          {session.rounds.map((round) => (
            <section key={round.id} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <h2 className="font-heading text-lg font-bold text-ink">
                  Round {round.roundNumber}
                </h2>
                <div className="h-px flex-1 bg-outline/30" />
              </div>
              <div className="flex flex-col gap-3">
                {round.matches.map((m) => {
                  const server = servingPlayer(m);
                  const isOpen = expanded === m.id;
                  return (
                    <div
                      key={m.id}
                      className="overflow-hidden rounded-xl border border-outline/30 bg-surface shadow-lg"
                    >
                      <button
                        className="flex w-full items-start justify-between p-4 text-left"
                        onClick={() => setExpanded(isOpen ? null : m.id)}
                      >
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
                              Court {m.courtNumber}
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
                        </div>
                        <div className="whitespace-nowrap font-heading text-2xl font-black tabular-nums text-lime">
                          {m.team1Score}&ndash;{m.team2Score}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="space-y-5 border-t border-outline/30 bg-surface-high p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-lime">
                              <span className="material-symbols-outlined text-lg">
                                sports_tennis
                              </span>
                              <span className="text-xs font-black uppercase tracking-widest">
                                Serving: {server.name}
                              </span>
                            </div>
                            {!m.completed && (
                              <button
                                onClick={() => switchServe(m.id)}
                                className="rounded-full border border-outline bg-surface-highest px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-ink-muted active:scale-95 transition-transform"
                              >
                                Switch Serve
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <ScoreControl
                              label="Team 1"
                              score={m.team1Score}
                              disabled={m.completed}
                              onChange={(d) => adjustScore(m.id, 1, d)}
                              onSet={(v) => setScore(m.id, 1, v)}
                            />
                            <ScoreControl
                              label="Team 2"
                              score={m.team2Score}
                              disabled={m.completed}
                              onChange={(d) => adjustScore(m.id, 2, d)}
                              onSet={(v) => setScore(m.id, 2, v)}
                            />
                          </div>

                          {!m.completed ? (
                            <button
                              onClick={() => finishMatch(m.id)}
                              className="w-full rounded-xl bg-lime py-4 font-heading text-sm font-black uppercase tracking-wide text-on-lime shadow-lg active:scale-[0.98] transition-transform"
                            >
                              Finish Match
                            </button>
                          ) : (
                            <p className="text-center text-sm font-bold uppercase tracking-widest text-lime-dim">
                              Finished
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <button
            onClick={generateRound}
            disabled={generating}
            className="group flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline py-8 transition-colors active:scale-[0.98] disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-3xl text-outline group-active:text-lime">
              add_circle
            </span>
            <span className="font-heading text-sm font-bold uppercase tracking-widest text-ink-muted group-active:text-lime">
              {generating ? "Adding..." : "Add More Matches"}
            </span>
          </button>
        </div>
      )}

      {tab === "standings" && (
        <div className="px-5 pt-4">
          <div className="relative mb-4 flex rounded-xl bg-surface-low p-1">
            <button
              onClick={() => setSortBy("sd")}
              className={`flex-1 rounded-lg py-2.5 text-center text-xs font-black uppercase tracking-widest transition-colors ${
                sortBy === "sd" ? "bg-lime text-on-lime" : "text-ink-muted"
              }`}
            >
              Sort: SD
            </button>
            <button
              onClick={() => setSortBy("score")}
              className={`flex-1 rounded-lg py-2.5 text-center text-xs font-black uppercase tracking-widest transition-colors ${
                sortBy === "score" ? "bg-lime text-on-lime" : "text-ink-muted"
              }`}
            >
              Sort: Score
            </button>
          </div>

          <StandingsTable rows={standings} sortBy={sortBy} />
        </div>
      )}
    </main>
  );
}

function ScoreControl({
  label,
  score,
  disabled,
  onChange,
  onSet,
}: {
  label: string;
  score: number;
  disabled: boolean;
  onChange: (delta: 1 | -1) => void;
  onSet: (value: number) => void;
}) {
  const [text, setText] = useState(String(score));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(score));
  }, [score, focused]);

  function commit() {
    const parsed = parseInt(text, 10);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed !== score) {
      onSet(parsed);
    } else {
      setText(String(score));
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-outline/20 bg-surface-low p-4">
      <span className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={text}
        disabled={disabled}
        onFocus={(e) => {
          setFocused(true);
          e.target.select();
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="w-24 bg-transparent text-center font-heading text-5xl font-black tabular-nums text-lime outline-none disabled:opacity-60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <div className="mt-1 flex gap-4">
        <button
          disabled={disabled}
          onClick={() => onChange(-1)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-highest text-ink-muted active:scale-90 transition-transform disabled:opacity-30"
        >
          <span className="material-symbols-outlined">remove</span>
        </button>
        <button
          disabled={disabled}
          onClick={() => onChange(1)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-lime text-on-lime shadow-md shadow-lime/20 active:scale-90 transition-transform disabled:opacity-30"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

const MEDAL_STYLE = [
  "bg-gradient-to-br from-gold to-yellow-700 text-black",
  "bg-gradient-to-br from-silver to-slate-500 text-black",
  "bg-gradient-to-br from-bronze to-amber-800 text-black",
];

export function StandingsTable({
  rows,
  sortBy,
}: {
  rows: StandingRow[];
  sortBy: "sd" | "score";
}) {
  const sorted = [...rows].sort((a, b) => {
    const primary = sortBy === "sd" ? b.sd - a.sd : b.score - a.score;
    if (primary !== 0) return primary;
    return b.score - a.score || b.wins - a.wins;
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-outline/30 bg-surface-low shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left">
          <thead>
            <tr className="border-b border-outline bg-surface-high/50">
              <th className="w-12 px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-ink-muted">
                #
              </th>
              <th className="px-2 py-3 text-[10px] font-black uppercase tracking-widest text-ink-muted">
                Player
              </th>
              <th className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-widest text-ink-muted">
                W-T-L
              </th>
              <th className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-widest text-ink-muted">
                SD
              </th>
              <th className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-widest text-ink-muted">
                +M
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-ink-muted">
                Score
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline/20">
            {sorted.map((r, idx) => (
              <tr key={r.playerId} className="transition-colors hover:bg-surface-high">
                <td className="px-4 py-3 text-center">
                  <div
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
                      idx < 3 ? MEDAL_STYLE[idx] : "bg-outline/30 text-ink-muted"
                    }`}
                  >
                    {idx + 1}
                  </div>
                </td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-highest">
                      <span className="text-xs font-black text-ink/50">{initials(r.name)}</span>
                    </div>
                    <span className="font-bold text-ink">{r.name}</span>
                  </div>
                </td>
                <td className="px-2 py-3 text-center tabular-nums text-ink-muted">
                  {r.wins}-{r.ties}-{r.losses}
                </td>
                <td
                  className={`px-2 py-3 text-center font-bold tabular-nums ${
                    r.sd > 0 ? "text-lime-dim" : r.sd < 0 ? "text-live" : "text-ink-muted"
                  }`}
                >
                  {r.sd > 0 ? `+${r.sd}` : r.sd}
                </td>
                <td className="px-2 py-3 text-center tabular-nums text-ink-muted/60">
                  {r.mBonus ? `+${r.mBonus}` : ""}
                </td>
                <td className="px-4 py-3 text-right font-heading text-lg font-black tabular-nums text-ink">
                  {r.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
