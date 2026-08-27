"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ConfirmModal } from "@/app/ConfirmModal";
import { ThemeToggle } from "@/app/ThemeToggle";
import { Spinner } from "@/app/Spinner";
import { LoadingModal } from "@/app/LoadingModal";
import { StandingsTable } from "@/app/StandingsTable";
import { ExportStandingsButton } from "@/app/ExportStandingsButton";
import { useSessionData } from "@/app/useSessionData";
import { takeFinishedMatch } from "@/lib/lastFinishedMatch";
import type { PlayerRef, MatchDto } from "@/lib/types";

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

const matchAnchorId = (matchId: string) => `match-${matchId}`;

function hasLiveMatch(session: { rounds: { matches: { completed: boolean }[] }[] } | null) {
  return session?.rounds.at(-1)?.matches.some((m) => !m.completed) ?? false;
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { session, standings, refresh } = useSessionData(id, (s) =>
    hasLiveMatch(s) ? 3000 : 15000
  );
  const [tab, setTab] = useState<"matches" | "standings">("matches");
  const [generating, setGenerating] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const [rebalancing, setRebalancing] = useState(false);
  const [confirmingRebalance, setConfirmingRebalance] = useState(false);
  const [starting, setStarting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
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

  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.role === "admin"))
      .catch(() => {});
  }, []);

  // Fixed-partner team assignment for a still-registering session — seeded
  // from whatever's already saved, edited locally, then written back with
  // "Save Teams". Only re-seeded when the session itself changes, not on
  // every poll refresh, so it doesn't clobber an admin's in-progress taps.
  const [teamPairs, setTeamPairs] = useState<[string, string][]>([]);
  const [selectedForTeam, setSelectedForTeam] = useState<string | null>(null);
  const [savingTeams, setSavingTeams] = useState(false);
  const [teamsError, setTeamsError] = useState("");
  useEffect(() => {
    if (!session) return;
    setTeamPairs(session.fixedPartnerships.map((p) => [p.player1Id, p.player2Id]));
  }, [session?.id]);

  // Coming back from the scoreboard, scroll to the match just finished. The
  // browser can't restore this itself: the list is fetched client-side, so at
  // restoration time the page is still the loading modal. Runs once per finish
  // -- takeFinishedMatch() clears the target as it reads it.
  const hasMatches = !!session && session.rounds.length > 0;
  useEffect(() => {
    if (!hasMatches) return;
    const matchId = takeFinishedMatch();
    if (!matchId) return;
    document
      .getElementById(matchAnchorId(matchId))
      ?.scrollIntoView({ block: "center" });
  }, [hasMatches]);

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

  const hasIncomplete = session?.rounds.some((r) => r.matches.some((m) => !m.completed));

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

  async function copyRegistrationLink() {
    const url = `${window.location.origin}/session/${id}/register`;
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  }

  function tapForTeam(playerId: string) {
    if (selectedForTeam === null) {
      setSelectedForTeam(playerId);
    } else if (selectedForTeam === playerId) {
      setSelectedForTeam(null);
    } else {
      setTeamPairs((prev) => [...prev, [selectedForTeam, playerId]]);
      setSelectedForTeam(null);
    }
  }

  function untapTeam(pair: [string, string]) {
    setTeamPairs((prev) => prev.filter((p) => p !== pair));
  }

  function randomizeTeams() {
    if (!session) return;
    const ids = session.players.map((sp) => sp.player.id);
    const shuffled = [...ids];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const newPairs: [string, string][] = [];
    for (let i = 0; i + 1 < shuffled.length; i += 2) {
      newPairs.push([shuffled[i], shuffled[i + 1]]);
    }
    setTeamPairs(newPairs);
    setSelectedForTeam(null);
  }

  async function saveTeams() {
    setTeamsError("");
    setSavingTeams(true);
    const res = await fetch(`/api/sessions/${id}/partnerships`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerships: teamPairs }),
    });
    setSavingTeams(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setTeamsError(body.error || "Could not save teams");
      return;
    }
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
    setEditScores(
      session?.scoringMode === "SET"
        ? { team1: m.team1Games, team2: m.team2Games }
        : { team1: m.team1Score, team2: m.team2Score }
    );
  }

  async function saveEditScore(matchId: string) {
    setSavingScore(true);
    const body =
      session?.scoringMode === "SET"
        ? { team1Games: editScores.team1, team2Games: editScores.team2 }
        : { team1Score: editScores.team1, team2Score: editScores.team2 };
    await fetch(`/api/matches/${matchId}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

  const rosterPlayers = session.players.map((sp) => sp.player);
  const pairedIds = new Set(teamPairs.flat());
  const unpairedPlayers = rosterPlayers.filter((p) => !pairedIds.has(p.id));
  const teamsComplete =
    rosterPlayers.length > 0 &&
    teamPairs.flat().length === rosterPlayers.length &&
    pairedIds.size === rosterPlayers.length;
  const needsTeams = session.fixedPartners && !teamsComplete;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col bg-bg pb-24 md:max-w-xl lg:max-w-2xl">
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
              &middot;{" "}
              {session.scoringMode === "SET"
                ? `${session.gamesPerSet} games/set${session.goldenPoint ? ", golden point" : ""}`
                : `to ${session.pointsPerMatch}, serve/${session.pointsPerServe}`}
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
          <div className="flex items-center gap-3">
            <Link
              href={`/session/${id}/register`}
              className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-lime-dim"
            >
              <span className="material-symbols-outlined text-sm">group</span>
              Players
            </Link>
            <Link
              href={`/session/${id}/board`}
              target="_blank"
              className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-lime-dim"
            >
              <span className="material-symbols-outlined text-sm">tv</span>
              TV Board
            </Link>
          </div>
        </div>
      </header>

      {tab === "matches" && session.rounds.length === 0 && (
        <div className="flex flex-col gap-4 px-5 pt-4">
          <div className="rounded-xl border-2 border-dashed border-outline p-6 text-center">
            <p className="text-sm text-ink-muted">
              Registration is open &mdash; share this link so players can add their own name.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={copyRegistrationLink}
                className="inline-flex items-center gap-2 rounded-xl bg-lime px-4 py-2 text-sm font-bold text-on-lime"
              >
                <span className="material-symbols-outlined text-lg">
                  {linkCopied ? "check" : "content_copy"}
                </span>
                {linkCopied ? "Copied!" : "Copy Link"}
              </button>
              <Link
                href={`/session/${id}/register`}
                className="inline-flex items-center gap-2 rounded-xl bg-surface-highest px-4 py-2 text-sm font-bold text-ink"
              >
                <span className="material-symbols-outlined text-lg">person_add</span>
                Open Registration Page
              </Link>
            </div>
          </div>

          {session.fixedPartners && isAdmin && (
            <div className="rounded-xl border-2 border-dashed border-outline p-4">
              <div className="mb-3 flex items-end justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-ink-muted">
                  Assign Teams
                </span>
                <span className="text-xs font-bold text-lime">
                  {teamPairs.length} Team{teamPairs.length === 1 ? "" : "s"}
                </span>
              </div>

              {rosterPlayers.length >= 4 && rosterPlayers.length % 2 === 0 && (
                <button
                  type="button"
                  onClick={randomizeTeams}
                  className="neu-raised mb-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-ink-muted transition-colors active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-lg">shuffle</span>
                  Auto-Assign Teams
                </button>
              )}

              {unpairedPlayers.length > 0 && (
                <div className="mb-3">
                  <p className="mb-2 text-xs text-ink-muted">Tap two players to pair them up.</p>
                  <div className="flex flex-wrap gap-2">
                    {unpairedPlayers.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => tapForTeam(p.id)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                          selectedForTeam === p.id
                            ? "bg-lime text-on-lime"
                            : "neu-raised text-ink-muted"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-3 flex flex-col gap-2">
                {teamPairs.map((pair, idx) => {
                  const nameOf = (pid: string) =>
                    rosterPlayers.find((p) => p.id === pid)?.name ?? "?";
                  return (
                    <div
                      key={`${pair[0]}-${pair[1]}`}
                      className="neu-inset-sm flex items-center justify-between rounded-xl px-4 py-2"
                    >
                      <span className="text-sm text-ink">
                        Team {idx + 1}: {nameOf(pair[0])} &amp; {nameOf(pair[1])}
                      </span>
                      <button
                        type="button"
                        onClick={() => untapTeam(pair)}
                        aria-label="Unpair team"
                        className="material-symbols-outlined text-lg text-ink-muted"
                      >
                        close
                      </button>
                    </div>
                  );
                })}
              </div>

              {teamsError && <p className="mb-2 text-sm text-live">{teamsError}</p>}
              <button
                type="button"
                onClick={saveTeams}
                disabled={savingTeams || teamPairs.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime py-3 text-sm font-bold text-on-lime disabled:opacity-40"
              >
                {savingTeams ? <Spinner className="text-base" /> : "Save Teams"}
              </button>
            </div>
          )}

          <button
            onClick={startSession}
            disabled={starting || session.players.length < 4 || needsTeams}
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
                : needsTeams
                  ? "Assign teams before starting"
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
                      id={matchAnchorId(m.id)}
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
                            {session.scoringMode === "SET"
                              ? `${m.team1Games}–${m.team2Games}`
                              : `${m.team1Score}–${m.team2Score}`}
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
          <div className="mb-4 flex items-center justify-between gap-3">
            <ExportStandingsButton
              rows={standings}
              scoreLabel={session.scoringMode === "SET" ? "Games" : "Score"}
              sessionName={session.name}
              sessionDate={session.date}
            />
          </div>

          <StandingsTable
            rows={standings}
            scoreLabel={session.scoringMode === "SET" ? "Games" : "Score"}
          />
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

