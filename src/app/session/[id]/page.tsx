"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ConfirmModal } from "@/app/ConfirmModal";
import { ThemeToggle } from "@/app/ThemeToggle";
import { Spinner } from "@/app/Spinner";
import { LoadingModal } from "@/app/LoadingModal";
import type { PlayerRef, MatchDto, SessionDto, StandingRow } from "@/lib/types";

function servingPlayer(m: MatchDto): PlayerRef {
  if (m.servingTeam === 1) {
    return m.team1ServerSlot === 1 ? m.team1Player1 : m.team1Player2;
  }
  return m.team2ServerSlot === 1 ? m.team2Player1 : m.team2Player2;
}

const MATCH_SLOTS = ["team1Player1", "team1Player2", "team2Player1", "team2Player2"] as const;
type MatchSlot = (typeof MATCH_SLOTS)[number];

function PlayerChip({
  match,
  slot,
  roster,
  open,
  onOpen,
  onClose,
  onPick,
}: {
  match: MatchDto;
  slot: MatchSlot;
  roster: PlayerRef[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onPick: (playerId: string) => void;
}) {
  const player = match[slot];
  const otherIds = MATCH_SLOTS.filter((s) => s !== slot).map((s) => match[s].id);
  const options = roster.filter((p) => !otherIds.includes(p.id));

  if (open) {
    return (
      <select
        autoFocus
        value={player.id}
        onChange={(e) => onPick(e.target.value)}
        onBlur={onClose}
        className="rounded border border-lime bg-surface-low px-1 text-sm text-ink"
      >
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <button onClick={onOpen} className="underline decoration-dotted underline-offset-2">
      {player.name}
    </button>
  );
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [session, setSession] = useState<SessionDto | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [tab, setTab] = useState<"matches" | "standings">("matches");
  const [sortBy, setSortBy] = useState<"sd" | "score">("sd");
  const [generating, setGenerating] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const [rebalancing, setRebalancing] = useState(false);
  const [confirmingRebalance, setConfirmingRebalance] = useState(false);
  const [starting, setStarting] = useState(false);
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [swapName, setSwapName] = useState("");
  const [editingCourts, setEditingCourts] = useState(false);
  const [courtsValue, setCourtsValue] = useState(1);
  const [savingCourts, setSavingCourts] = useState(false);
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [editScores, setEditScores] = useState({ team1: 0, team2: 0 });
  const [savingScore, setSavingScore] = useState(false);
  const [reshuffling, setReshuffling] = useState<{ matchId: string; slot: MatchSlot } | null>(
    null
  );
  const chipRowRef = useRef<HTMLDivElement>(null);

  // Mouse wheel has no horizontal axis, and the strip's scrollbar is hidden,
  // so without this a mouse-only (non-touch, non-trackpad) user has no way
  // to reach chips past the visible width.
  useEffect(() => {
    const el = chipRowRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      el!.scrollLeft += e.deltaY;
      e.preventDefault();
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [session?.id]);

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

  async function reopenMatch(matchId: string) {
    await fetch(`/api/matches/${matchId}/reopen`, { method: "POST" });
    refresh();
  }

  async function generateRound() {
    setGenerating(true);
    await fetch(`/api/sessions/${id}/rounds`, { method: "POST" });
    setGenerating(false);
    refresh();
  }

  async function startSession() {
    setStarting(true);
    await fetch(`/api/sessions/${id}/start`, { method: "POST" });
    setStarting(false);
    refresh();
  }

  async function rebalanceRounds() {
    setRebalancing(true);
    await fetch(`/api/sessions/${id}/rebalance`, { method: "POST" });
    setRebalancing(false);
    setConfirmingRebalance(false);
    refresh();
  }

  async function endSession() {
    setEnding(true);
    await fetch(`/api/sessions/${id}/end`, { method: "POST" });
    setEnding(false);
    setConfirmingEnd(false);
    refresh();
  }

  async function saveCourts() {
    setSavingCourts(true);
    await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courts: courtsValue }),
    });
    setSavingCourts(false);
    setEditingCourts(false);
    refresh();
  }

  async function confirmSwap(playerId: string) {
    const newName = swapName.trim();
    if (!newName) return;
    await fetch(`/api/sessions/${id}/players/${playerId}/swap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newName }),
    });
    setSwappingId(null);
    setSwapName("");
    refresh();
  }

  function startEditScore(m: MatchDto) {
    setEditingScoreId(m.id);
    setEditScores({ team1: m.team1Score, team2: m.team2Score });
  }

  async function saveEditScore(matchId: string) {
    setSavingScore(true);
    await fetch(`/api/matches/${matchId}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team1Score: editScores.team1, team2Score: editScores.team2 }),
    });
    setSavingScore(false);
    setEditingScoreId(null);
    refresh();
  }

  async function replacePlayer(matchId: string, slot: MatchSlot, playerId: string) {
    setReshuffling(null);
    await fetch(`/api/matches/${matchId}/player`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot, playerId }),
    });
    refresh();
  }

  if (!session) {
    return <LoadingModal open />;
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col bg-bg pb-24">
      <header className="glass sticky top-0 z-10 px-5 py-4">
        <div className="mb-3 flex items-center gap-3">
          <Link href="/" className="material-symbols-outlined text-ink">
            arrow_back
          </Link>
          <div className="flex-1">
            <h1 className="font-heading text-lg font-black text-ink">{session.name}</h1>
            {session.courtName && (
              <p className="text-xs text-ink-muted">{session.courtName}</p>
            )}
            <p className="text-xs text-ink-muted">
              {session.players.length} players &middot;{" "}
              {session.dynamicCourts && editingCourts ? (
                <span className="inline-flex items-center gap-1 align-middle">
                  <input
                    autoFocus
                    type="number"
                    min={1}
                    max={20}
                    value={courtsValue}
                    onChange={(e) => setCourtsValue(Number(e.target.value))}
                    className="w-10 rounded border border-lime bg-surface-low px-1 text-xs text-ink"
                  />
                  <button
                    onClick={saveCourts}
                    disabled={savingCourts}
                    aria-label="Save courts"
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-lime text-on-lime"
                  >
                    <span className="material-symbols-outlined text-xs">check</span>
                  </button>
                  <button
                    onClick={() => setEditingCourts(false)}
                    aria-label="Cancel edit"
                    className="flex h-5 w-5 items-center justify-center text-ink-muted"
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </span>
              ) : session.dynamicCourts ? (
                <button
                  onClick={() => {
                    setEditingCourts(true);
                    setCourtsValue(session.courts);
                  }}
                  className="underline decoration-dotted underline-offset-2"
                >
                  {session.courts} court{session.courts > 1 ? "s" : ""}
                </button>
              ) : (
                <span>
                  {session.courts} court{session.courts > 1 ? "s" : ""}
                </span>
              )}{" "}
              &middot; to {session.pointsPerMatch}, serve/{session.pointsPerServe}
            </p>
          </div>
          <ThemeToggle />
          {hasIncomplete && (
            <button
              onClick={() => setConfirmingEnd(true)}
              className="neu-raised whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-ink-muted transition-shadow active:shadow-none"
            >
              End Session
            </button>
          )}
        </div>

        <div
          ref={chipRowRef}
          className="no-scrollbar mb-2 flex snap-x gap-2 overflow-x-auto scroll-smooth"
        >
          {session.players.map(({ player }) => (
            <div key={player.id} className="shrink-0 snap-start">
              {swappingId === player.id ? (
                <div className="flex items-center gap-1 rounded-full border border-lime bg-surface-low pl-3 pr-1">
                  <input
                    autoFocus
                    value={swapName}
                    onChange={(e) => setSwapName(e.target.value)}
                    placeholder="New name"
                    className="w-24 bg-transparent py-1 text-xs text-ink outline-none"
                  />
                  <button
                    onClick={() => confirmSwap(player.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-lime text-on-lime"
                  >
                    <span className="material-symbols-outlined text-sm">check</span>
                  </button>
                  <button
                    onClick={() => setSwappingId(null)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setSwappingId(player.id);
                    setSwapName("");
                  }}
                  className="neu-raised flex items-center gap-1 rounded-full px-3 py-1 text-xs text-ink-muted transition-shadow active:shadow-none"
                >
                  {player.name}
                  <span className="material-symbols-outlined text-sm text-accent-blue">
                    swap_horiz
                  </span>
                </button>
              )}
            </div>
          ))}
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

      {tab === "matches" && session.rounds.length === 0 && (
        <div className="flex flex-col gap-4 px-5 pt-4">
          <div className="rounded-xl border-2 border-dashed border-outline p-6 text-center">
            <p className="text-sm text-ink-muted">
              Registration is open &mdash; share this link so players can add their own name.
            </p>
            <Link
              href={`/session/${id}/register`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-surface-highest px-4 py-2 text-sm font-bold text-ink"
            >
              <span className="material-symbols-outlined text-lg">person_add</span>
              Open Registration Page
            </Link>
          </div>
          <button
            onClick={startSession}
            disabled={starting || session.players.length < 4}
            className="shimmer-btn"
          >
            {starting ? (
              <Spinner className="text-base" />
            ) : (
              <span className="material-symbols-outlined text-base">bolt</span>
            )}
            {starting
              ? "Starting..."
              : session.players.length < 4
                ? `Need ${4 - session.players.length} more player${4 - session.players.length > 1 ? "s" : ""}`
                : "Start Session"}
          </button>
        </div>
      )}

      {tab === "matches" && session.rounds.length > 0 && (
        <div className="flex flex-col gap-6 px-5 pt-4">
          <button
            onClick={() => setConfirmingRebalance(true)}
            disabled={rebalancing}
            className="shimmer-btn"
          >
            {rebalancing ? <Spinner className="text-base" /> : <span className="material-symbols-outlined text-base">balance</span>}
            {rebalancing ? "Rebalancing..." : "Rebalance Remaining Rounds"}
          </button>

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
                  return (
                    <div
                      key={m.id}
                      className="glass overflow-hidden rounded-xl"
                    >
                      <div className="flex items-start justify-between p-4">
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
                          <p className="flex flex-wrap items-center gap-x-1 text-sm leading-tight text-ink">
                            {MATCH_SLOTS.map((slot, idx) => (
                              <span key={slot} className="flex items-center gap-x-1">
                                <PlayerChip
                                  match={m}
                                  slot={slot}
                                  roster={session.players.map((sp) => sp.player)}
                                  open={
                                    reshuffling?.matchId === m.id && reshuffling.slot === slot
                                  }
                                  onOpen={() => setReshuffling({ matchId: m.id, slot })}
                                  onClose={() => setReshuffling(null)}
                                  onPick={(playerId) => replacePlayer(m.id, slot, playerId)}
                                />
                                {idx === 0 && <span>&amp;</span>}
                                {idx === 1 && (
                                  <span className="italic text-ink-muted">vs</span>
                                )}
                                {idx === 2 && <span>&amp;</span>}
                              </span>
                            ))}
                          </p>
                          {!m.completed && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-lime">
                              <span className="material-symbols-outlined text-sm">
                                sports_tennis
                              </span>
                              Serving: {server.name}
                            </p>
                          )}
                        </div>
                        {editingScoreId === m.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              type="number"
                              value={editScores.team1}
                              onChange={(e) =>
                                setEditScores((s) => ({ ...s, team1: Number(e.target.value) }))
                              }
                              className="w-12 rounded-lg border border-lime bg-surface-low px-1 py-1 text-center font-heading text-lg font-black tabular-nums text-lime"
                            />
                            <span className="text-ink-muted">&ndash;</span>
                            <input
                              type="number"
                              value={editScores.team2}
                              onChange={(e) =>
                                setEditScores((s) => ({ ...s, team2: Number(e.target.value) }))
                              }
                              className="w-12 rounded-lg border border-lime bg-surface-low px-1 py-1 text-center font-heading text-lg font-black tabular-nums text-lime"
                            />
                            <button
                              onClick={() => saveEditScore(m.id)}
                              disabled={savingScore}
                              aria-label="Save score"
                              className="ml-1 flex h-6 w-6 items-center justify-center text-lime disabled:opacity-40"
                            >
                              {savingScore ? (
                                <Spinner className="text-xl" />
                              ) : (
                                <span className="material-symbols-outlined text-xl">check</span>
                              )}
                            </button>
                            <button
                              onClick={() => setEditingScoreId(null)}
                              aria-label="Cancel edit"
                              className="material-symbols-outlined text-xl text-ink-muted"
                            >
                              close
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => !m.completed && startEditScore(m)}
                            disabled={m.completed}
                            aria-label="Edit score"
                            className="neu-inset-sm flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1.5 font-heading text-2xl font-black tabular-nums text-lime disabled:opacity-100"
                          >
                            {m.team1Score}&ndash;{m.team2Score}
                            {!m.completed && (
                              <span className="material-symbols-outlined text-sm text-ink-muted">
                                edit
                              </span>
                            )}
                          </button>
                        )}
                      </div>

                      <div className="border-t border-white/5 bg-black/10 p-3">
                        {!m.completed ? (
                          <Link
                            href={`/session/${id}/match/${m.id}`}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime py-3 font-heading text-sm font-black uppercase tracking-wide text-on-lime active:scale-[0.98] transition-transform"
                          >
                            <span className="material-symbols-outlined text-lg">scoreboard</span>
                            Scoreboard
                          </Link>
                        ) : (
                          <div className="flex items-center justify-center gap-3">
                            <p className="text-sm font-bold uppercase tracking-widest text-lime-dim">
                              Finished
                            </p>
                            <button
                              onClick={() => reopenMatch(m.id)}
                              className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-ink-muted"
                            >
                              <span className="material-symbols-outlined text-sm">undo</span>
                              Reopen
                            </button>
                          </div>
                        )}
                      </div>
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
            {generating ? (
              <Spinner className="text-3xl text-outline" />
            ) : (
              <span className="material-symbols-outlined text-3xl text-outline group-active:text-lime">
                add_circle
              </span>
            )}
            <span className="font-heading text-sm font-bold uppercase tracking-widest text-ink-muted group-active:text-lime">
              {generating ? "Adding..." : "Add More Matches"}
            </span>
          </button>
        </div>
      )}

      {tab === "standings" && (
        <div className="px-5 pt-4">
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

          <StandingsTable rows={standings} sortBy={sortBy} />
        </div>
      )}

      <ConfirmModal
        open={confirmingEnd}
        title="End this session?"
        message="Any match still in progress gets locked in at its current score, and rounds that never started are removed."
        confirmLabel="End Session"
        loading={ending}
        onConfirm={endSession}
        onCancel={() => setConfirmingEnd(false)}
      />

      <ConfirmModal
        open={confirmingRebalance}
        title="Rebalance remaining rounds?"
        message="Every round that hasn't started yet gets deleted and regenerated using each player's current games-played and partner history — useful after swapping a player mid-session. Rounds already live or finished are untouched."
        confirmLabel="Rebalance"
        loading={rebalancing}
        onConfirm={rebalanceRounds}
        onCancel={() => setConfirmingRebalance(false)}
      />
    </main>
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

  // Standard competition ranking: ties on the active sort key share a rank,
  // and the next distinct value skips ahead accordingly (1, 1, 3).
  const ranks: number[] = [];
  sorted.forEach((r, idx) => {
    if (idx === 0) {
      ranks.push(1);
      return;
    }
    const prev = sorted[idx - 1];
    const tied = sortBy === "sd" ? r.sd === prev.sd : r.score === prev.score;
    ranks.push(tied ? ranks[idx - 1] : idx + 1);
  });

  return (
    <div className="glass overflow-hidden rounded-2xl">
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
                      ranks[idx] <= 3 ? MEDAL_STYLE[ranks[idx] - 1] : "bg-outline/30 text-ink-muted"
                    }`}
                  >
                    {ranks[idx]}
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
                <td className="px-2 py-3 text-center font-bold tabular-nums text-accent-orange">
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
