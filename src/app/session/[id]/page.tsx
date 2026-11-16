"use client";

import { use, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ConfirmModal } from "@/app/ConfirmModal";
import { ThemeToggle } from "@/app/ThemeToggle";
import { Spinner } from "@/app/Spinner";
import { LoadingModal } from "@/app/LoadingModal";
import { RollingNumber } from "@/app/RollingNumber";
import { StandingsTable } from "@/app/StandingsTable";
import { ExportStandingsButton } from "@/app/ExportStandingsButton";
import { useSessionData } from "@/app/useSessionData";
import { takeFinishedMatch } from "@/lib/lastFinishedMatch";
import { computeMatchTitle } from "@/lib/matchTitle";
import { readRespectMaxPoints } from "@/lib/settings";
import { courtLabel, type PlayerRef, type MatchDto, type RoundDto, type SessionDto } from "@/lib/types";

const SPRING = { type: "spring", stiffness: 420, damping: 34 } as const;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

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
        className="max-w-full rounded-lg border border-lime bg-surface-low px-1 text-base text-ink"
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
    <button
      onClick={onOpen}
      className="truncate text-left underline decoration-current/30 decoration-dotted underline-offset-4"
    >
      {player.name}
    </button>
  );
}

const matchAnchorId = (matchId: string) => `match-${matchId}`;

function hasLiveMatch(session: { rounds: { matches: { completed: boolean }[] }[] } | null) {
  return session?.rounds.at(-1)?.matches.some((m) => !m.completed) ?? false;
}

// The round being played right now: the first one with an unfinished match,
// or the last round once everything is done.
function currentRoundOf(rounds: RoundDto[]): RoundDto | undefined {
  return rounds.find((r) => r.matches.some((m) => !m.completed)) ?? rounds.at(-1);
}

type Tab = "courts" | "standings" | "players";

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { session, standings, refresh } = useSessionData(id, (s) =>
    hasLiveMatch(s) ? 3000 : 15000
  );
  const [tab, setTab] = useState<Tab>("courts");
  const [sheetOpen, setSheetOpen] = useState(false);
  // null = follow the live round as it advances; a number = pinned by a tap.
  const [pickedRound, setPickedRound] = useState<number | null>(null);
  // Coming back from the scoreboard, show the round and court card of the
  // match just played. The list is fetched client-side, so the browser can't
  // restore this itself. takeFinishedMatch() clears the target as it reads
  // it, and returns null during the server render.
  const [returnToMatchId, setReturnToMatchId] = useState<string | null>(() =>
    takeFinishedMatch()
  );
  const [generating, setGenerating] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const [rebalancing, setRebalancing] = useState(false);
  const [confirmingRebalance, setConfirmingRebalance] = useState(false);
  const [starting, setStarting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [matchesLinkCopied, setMatchesLinkCopied] = useState(false);
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [swapName, setSwapName] = useState("");
  const [editingCourts, setEditingCourts] = useState(false);
  const [courtsValue, setCourtsValue] = useState(1);
  const [courtNamesValue, setCourtNamesValue] = useState<string[]>([]);
  const [savingCourts, setSavingCourts] = useState(false);
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [editScores, setEditScores] = useState({ team1: 0, team2: 0 });
  const [savingScore, setSavingScore] = useState(false);
  const [editScoreError, setEditScoreError] = useState("");
  const [reshuffling, setReshuffling] = useState<{ matchId: string; slot: MatchSlot } | null>(
    null
  );

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

  const hasIncomplete = session?.rounds.some((r) => r.matches.some((m) => !m.completed));
  const latestRound = session?.rounds[session.rounds.length - 1];
  const awaitingCurrentMexicanoRound =
    session?.sessionType === "MEXICANO" &&
    (latestRound?.matches.some((m) => !m.completed) ?? false);

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

  async function copyMatchesLink() {
    const url = `${window.location.origin}/session/${id}/view`;
    await navigator.clipboard.writeText(url);
    setMatchesLinkCopied(true);
    setTimeout(() => setMatchesLinkCopied(false), 1500);
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

  function setCourtsValueAndNames(count: number) {
    setCourtsValue(count);
    setCourtNamesValue((prev) => {
      const next = prev.slice(0, count);
      while (next.length < count) next.push("");
      return next;
    });
  }

  function updateCourtNameValue(idx: number, value: string) {
    setCourtNamesValue((prev) => prev.map((n, i) => (i === idx ? value : n)));
  }

  async function saveCourts() {
    setSavingCourts(true);
    await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courts: courtsValue,
        courtNames: courtNamesValue.map((n) => n.trim()),
      }),
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
    setEditScoreError("");
    setEditScores(
      session?.scoringMode === "SET"
        ? { team1: m.team1Games, team2: m.team2Games }
        : { team1: m.team1Score, team2: m.team2Score }
    );
  }

  async function saveEditScore(matchId: string) {
    if (!session) return;

    // Same "Respect max points" rule as the Scoreboard: gamesPerSet (SET) and
    // pointsPerMatch (POINTS) are both shared targets on the COMBINED total,
    // not a per-side max -- this is the manual editor that let an unfinished
    // 2-2 (out of 4 games) get saved as FINISHED.
    if (readRespectMaxPoints()) {
      if (session.scoringMode === "SET") {
        const total = editScores.team1 + editScores.team2;
        if (total > session.gamesPerSet) {
          setEditScoreError(`Combined games can't exceed ${session.gamesPerSet}.`);
          return;
        }
        if (total < session.gamesPerSet) {
          setEditScoreError(`Combined games must reach ${session.gamesPerSet} to finish the set.`);
          return;
        }
      } else if (editScores.team1 + editScores.team2 > session.pointsPerMatch) {
        setEditScoreError(`Combined score can't exceed ${session.pointsPerMatch}.`);
        return;
      }
    }

    setEditScoreError("");
    setSavingScore(true);
    const body =
      session.scoringMode === "SET"
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

  const started = session.rounds.length > 0;
  const currentRound = currentRoundOf(session.rounds);
  const returnRound = returnToMatchId
    ? session.rounds.find((r) => r.matches.some((m) => m.id === returnToMatchId))
    : undefined;
  const shownRound =
    session.rounds.find((r) => r.roundNumber === pickedRound) ?? returnRound ?? currentRound;
  const shownIdx = shownRound ? session.rounds.indexOf(shownRound) : -1;
  const isCurrent = !!shownRound && shownRound === currentRound;
  const nextRound = isCurrent ? session.rounds[shownIdx + 1] : undefined;
  const playingIds = new Set(
    shownRound?.matches.flatMap((m) => MATCH_SLOTS.map((s) => m[s].id)) ?? []
  );
  const sittingOut = rosterPlayers.filter((p) => !playingIds.has(p.id));
  const roundsDone = session.rounds.filter((r) => r.matches.every((m) => m.completed)).length;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-28 md:max-w-xl lg:max-w-2xl">
      <header className="glass-header sticky top-0 z-20 px-5 pb-3 pt-4">
        <div className="flex items-start gap-3">
          <Link
            href="/"
            aria-label="Back"
            className="pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-high text-ink"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-heading text-3xl font-black uppercase leading-none tracking-tight text-ink">
              {session.name}
            </h1>
            <p className="mt-1 text-xs text-ink-muted">
              {session.venueName && <>{session.venueName} &middot; </>}
              {session.players.length} players &middot;{" "}
              {session.dynamicCourts && editingCourts ? (
                <span className="inline-flex items-center gap-1 align-middle">
                  <input
                    autoFocus
                    type="number"
                    min={1}
                    max={20}
                    value={courtsValue}
                    onChange={(e) => setCourtsValueAndNames(Number(e.target.value))}
                    className="w-12 rounded-md border border-lime bg-surface-low px-1 text-xs text-ink"
                  />
                  <button
                    onClick={saveCourts}
                    disabled={savingCourts}
                    aria-label="Save courts"
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-lime text-on-lime"
                  >
                    <span className="material-symbols-outlined text-sm">check</span>
                  </button>
                  <button
                    onClick={() => setEditingCourts(false)}
                    aria-label="Cancel edit"
                    className="flex h-6 w-6 items-center justify-center text-ink-muted"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </span>
              ) : session.dynamicCourts ? (
                <button
                  onClick={() => {
                    setEditingCourts(true);
                    setCourtsValue(session.courts);
                    setCourtNamesValue(
                      Array.from({ length: session.courts }, (_, i) => session.courtNames[i] ?? "")
                    );
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
            {editingCourts && courtNamesValue.length > 1 && (
              <div className="mt-2 flex flex-col gap-1">
                {courtNamesValue.map((n, idx) => (
                  <input
                    key={idx}
                    value={n}
                    onChange={(e) => updateCourtNameValue(idx, e.target.value)}
                    placeholder={`Court ${idx + 1} name`}
                    className="h-8 rounded-lg border border-outline bg-surface-low px-2 text-xs text-ink outline-none focus:border-lime"
                  />
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            aria-label="Session actions"
            className="pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-high text-ink"
          >
            <span className="material-symbols-outlined">more_horiz</span>
          </button>
        </div>

        {started && (
          <div className="mt-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-heading text-xl font-extrabold uppercase text-ink">
                Round {shownRound?.roundNumber}
                <span className="text-ink-muted"> / {session.rounds.length}</span>
              </span>
              <span className="text-xs text-ink-muted">
                {roundsDone} of {session.rounds.length} done
                {pickedRound !== null && !isCurrent && (
                  <button
                    onClick={() => setPickedRound(null)}
                    className="ml-2 font-semibold text-lime"
                  >
                    Back to live
                  </button>
                )}
              </span>
            </div>
            <div className="flex gap-1">
              {session.rounds.map((r) => {
                const done = r.matches.every((m) => m.completed);
                const doneCount = r.matches.filter((m) => m.completed).length;
                const selected = r === shownRound;
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      setPickedRound(r === currentRound ? null : r.roundNumber);
                      setTab("courts");
                    }}
                    aria-label={`Round ${r.roundNumber}`}
                    className="group relative h-6 flex-1"
                  >
                    <span
                      className={`absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-surface-highest transition-all duration-300 ${
                        selected ? "h-2.5" : "h-1.5"
                      }`}
                    >
                      <motion.span
                        className="block h-full rounded-full bg-lime"
                        initial={false}
                        animate={{
                          width: done ? "100%" : `${(doneCount / r.matches.length) * 100}%`,
                          opacity: selected || done ? 1 : 0.55,
                        }}
                        transition={{ duration: 0.7, ease: EASE_OUT }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-3 flex gap-1 rounded-2xl bg-surface-high p-1">
          {(["courts", "standings", "players"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative flex-1 rounded-xl py-2 font-heading text-base font-bold uppercase tracking-wide transition-colors duration-300 ${
                tab === t ? "text-on-lime" : "text-ink-muted"
              }`}
            >
              {tab === t && (
                <motion.span
                  layoutId="session-tab"
                  className="absolute inset-0 -z-0 rounded-xl bg-lime"
                  transition={SPRING}
                />
              )}
              <span className="relative">{t}</span>
            </button>
          ))}
        </div>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
        >
          {tab === "courts" && !started && (
            <div className="stagger flex flex-col gap-4 px-5 pt-5">
              <div className="rounded-3xl bg-surface p-6 text-center">
                <span className="material-symbols-outlined text-5xl text-lime">how_to_reg</span>
                <p className="mt-2 font-heading text-2xl font-extrabold uppercase text-ink">
                  Registration open
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  Share this link so players can add their own name.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={copyRegistrationLink}
                    className="pressable inline-flex items-center gap-2 rounded-xl bg-lime px-4 py-2.5 text-sm font-bold text-on-lime"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {linkCopied ? "check" : "content_copy"}
                    </span>
                    {linkCopied ? "Copied!" : "Copy Link"}
                  </button>
                  <Link
                    href={`/session/${id}/register`}
                    className="pressable inline-flex items-center gap-2 rounded-xl bg-surface-highest px-4 py-2.5 text-sm font-bold text-ink"
                  >
                    <span className="material-symbols-outlined text-lg">person_add</span>
                    Open Registration Page
                  </Link>
                </div>
              </div>

              {session.fixedPartners && isAdmin && (
                <div className="rounded-3xl bg-surface p-4">
                  <div className="mb-3 flex items-end justify-between">
                    <span className="font-heading text-lg font-extrabold uppercase text-ink">
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
                      className="pressable mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-surface-high py-3 text-sm font-bold text-ink"
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
                          <motion.button
                            layout
                            key={p.id}
                            type="button"
                            onClick={() => tapForTeam(p.id)}
                            whileTap={{ scale: 0.9 }}
                            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                              selectedForTeam === p.id
                                ? "bg-lime text-on-lime"
                                : "bg-surface-high text-ink-muted"
                            }`}
                          >
                            {p.name}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-3 flex flex-col gap-2">
                    <AnimatePresence initial={false}>
                      {teamPairs.map((pair, idx) => {
                        const nameOf = (pid: string) =>
                          rosterPlayers.find((p) => p.id === pid)?.name ?? "?";
                        return (
                          <motion.div
                            layout
                            key={`${pair[0]}-${pair[1]}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={SPRING}
                            className="flex items-center justify-between rounded-xl bg-surface-low px-4 py-2"
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
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {teamsError && <p className="mb-2 text-sm text-live">{teamsError}</p>}
                  <button
                    type="button"
                    onClick={saveTeams}
                    disabled={savingTeams || teamPairs.length === 0}
                    className="pressable flex w-full items-center justify-center gap-2 rounded-xl bg-lime py-3 text-sm font-bold text-on-lime disabled:opacity-40"
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
                  <span className="material-symbols-outlined text-xl">bolt</span>
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

          {tab === "courts" && started && shownRound && (
            <div className="flex flex-col gap-6 pt-5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={shownRound.id}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.32, ease: EASE_OUT }}
                >
                  <CourtCarousel
                    session={session}
                    matches={shownRound.matches}
                    live={isCurrent}
                    scrollToMatchId={returnRound ? returnToMatchId : null}
                    onScrolledToMatch={() => {
                      if (returnRound && returnRound !== currentRound) {
                        setPickedRound(returnRound.roundNumber);
                      }
                      setReturnToMatchId(null);
                    }}
                    renderCard={(m) => (
                      <MatchCard
                        sessionId={id}
                        session={session}
                        match={m}
                        live={isCurrent && !m.completed}
                        reshuffling={reshuffling}
                        setReshuffling={setReshuffling}
                        replacePlayer={replacePlayer}
                        editing={editingScoreId === m.id}
                        editScores={editScores}
                        setEditScores={setEditScores}
                        editScoreError={editScoreError}
                        savingScore={savingScore}
                        onStartEdit={() => startEditScore(m)}
                        onSaveEdit={() => saveEditScore(m.id)}
                        onCancelEdit={() => {
                          setEditingScoreId(null);
                          setEditScoreError("");
                        }}
                        onReopen={() => reopenMatch(m.id)}
                      />
                    )}
                  />
                </motion.div>
              </AnimatePresence>

              <div className="stagger flex flex-col gap-5 px-5">
                {nextRound && (
                  <section>
                    <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-widest text-ink-muted">
                      Up next &middot; Round {nextRound.roundNumber}
                    </h2>
                    <div className="flex flex-col divide-y divide-outline rounded-2xl bg-surface">
                      {nextRound.matches.map((m) => (
                        <div key={m.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                          <span className="w-16 shrink-0 font-heading text-xs font-bold uppercase text-ink-muted">
                            {courtLabel(session, m.courtNumber)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-ink">
                            {m.team1Player1.name} &amp; {m.team1Player2.name}
                            <span className="text-ink-muted"> vs </span>
                            {m.team2Player1.name} &amp; {m.team2Player2.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {sittingOut.length > 0 && (
                  <section>
                    <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-widest text-ink-muted">
                      Sitting out
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {sittingOut.map((p) => (
                        <span
                          key={p.id}
                          className="rounded-full bg-surface-high px-3 py-1.5 text-sm text-ink"
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                <button
                  onClick={generateRound}
                  disabled={generating || awaitingCurrentMexicanoRound}
                  className="pressable group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-outline py-5 disabled:opacity-40"
                >
                  {generating ? (
                    <Spinner className="text-2xl text-ink-muted" />
                  ) : (
                    <span className="material-symbols-outlined text-2xl text-ink-muted group-active:text-lime">
                      add_circle
                    </span>
                  )}
                  <span className="font-heading text-base font-bold uppercase tracking-widest text-ink-muted group-active:text-lime">
                    {generating
                      ? "Adding..."
                      : awaitingCurrentMexicanoRound
                        ? "Finish this round first"
                        : "Add More Matches"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {tab === "standings" && (
            <div className="px-5 pt-5">
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

          {tab === "players" && (
            <div className="px-5 pt-5">
              <p className="mb-3 text-sm text-ink-muted">
                Tap swap to put a substitute in for a player.
              </p>
              <div className="stagger flex flex-col gap-2">
                {session.players.map(({ player }) => (
                  <motion.div
                    layout
                    key={player.id}
                    className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3"
                  >
                    {swappingId === player.id ? (
                      <>
                        <input
                          autoFocus
                          value={swapName}
                          onChange={(e) => setSwapName(e.target.value)}
                          placeholder={`Replace ${player.name}`}
                          className="min-w-0 flex-1 rounded-lg border border-lime bg-surface-low px-3 py-2 text-sm text-ink outline-none"
                        />
                        <button
                          onClick={() => confirmSwap(player.id)}
                          aria-label="Confirm swap"
                          className="pressable flex h-9 w-9 items-center justify-center rounded-xl bg-lime text-on-lime"
                        >
                          <span className="material-symbols-outlined text-lg">check</span>
                        </button>
                        <button
                          onClick={() => setSwappingId(null)}
                          aria-label="Cancel swap"
                          className="pressable flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-highest font-heading text-sm font-bold uppercase text-ink">
                          {player.name.slice(0, 2)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-base text-ink">
                          {player.name}
                        </span>
                        <button
                          onClick={() => {
                            setSwappingId(player.id);
                            setSwapName("");
                          }}
                          className="pressable flex items-center gap-1 rounded-xl bg-surface-high px-3 py-1.5 text-xs font-semibold text-ink"
                        >
                          <span className="material-symbols-outlined text-base">swap_horiz</span>
                          Swap
                        </button>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
              <Link
                href={`/session/${id}/register`}
                className="pressable mt-4 flex items-center justify-center gap-2 rounded-2xl bg-surface-high py-3 text-sm font-semibold text-ink"
              >
                <span className="material-symbols-outlined text-lg">group_add</span>
                Registration page
              </Link>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <ActionSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <SheetItem icon="tv" label="TV board" href={`/session/${id}/board`} newTab />
        <SheetItem
          icon={matchesLinkCopied ? "check" : "link"}
          label={matchesLinkCopied ? "Link copied" : "Copy share link"}
          onClick={copyMatchesLink}
        />
        <SheetItem icon="group" label="Players and registration" href={`/session/${id}/register`} />
        {started && (
          <SheetItem
            icon="balance"
            label="Rebalance remaining rounds"
            onClick={() => {
              setSheetOpen(false);
              setConfirmingRebalance(true);
            }}
          />
        )}
        <div className="flex items-center justify-between rounded-2xl px-4 py-3">
          <span className="flex items-center gap-3 text-base text-ink">
            <span className="material-symbols-outlined text-ink-muted">contrast</span>
            Light / dark
          </span>
          <ThemeToggle />
        </div>
        {hasIncomplete && (
          <SheetItem
            icon="stop_circle"
            label="End session"
            danger
            onClick={() => {
              setSheetOpen(false);
              setConfirmingEnd(true);
            }}
          />
        )}
      </ActionSheet>

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

// Horizontal, snap-scrolling strip with one court per screen. Cards off
// center shrink and fade as they scroll away; the dots track the centered
// card and can be tapped to jump.
function CourtCarousel({
  session,
  matches,
  live,
  scrollToMatchId,
  onScrolledToMatch,
  renderCard,
}: {
  session: SessionDto;
  matches: MatchDto[];
  live: boolean;
  scrollToMatchId: string | null;
  onScrolledToMatch: () => void;
  renderCard: (m: MatchDto) => React.ReactNode;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function update() {
    const strip = stripRef.current;
    if (!strip) return;
    const mid = strip.scrollLeft + strip.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(strip.children).forEach((child, i) => {
      const el = child as HTMLElement;
      const center = el.offsetLeft + el.offsetWidth / 2;
      const dist = Math.abs(center - mid);
      const k = Math.min(dist / el.offsetWidth, 1);
      el.style.transform = `scale(${1 - k * 0.07})`;
      el.style.opacity = String(1 - k * 0.5);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setActive(best);
  }

  useLayoutEffect(() => {
    update();
  }, [matches.length]);

  useEffect(() => {
    if (!scrollToMatchId) return;
    const el = document.getElementById(matchAnchorId(scrollToMatchId));
    if (!el) return;
    el.scrollIntoView({ inline: "center", block: "nearest" });
    onScrolledToMatch();
  }, [scrollToMatchId, onScrolledToMatch]);

  function jumpTo(i: number) {
    const el = stripRef.current?.children[i] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  return (
    <div>
      <div
        ref={stripRef}
        onScroll={() => requestAnimationFrame(update)}
        className={`no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 ${
          matches.length > 1 ? "px-[7%]" : "px-5"
        }`}
      >
        {matches.map((m) => (
          <div
            key={m.id}
            id={matchAnchorId(m.id)}
            className={`shrink-0 snap-center transition-[opacity] duration-150 will-change-transform ${
              matches.length > 1 ? "w-[86%]" : "w-full"
            }`}
          >
            {renderCard(m)}
          </div>
        ))}
      </div>
      {matches.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {matches.map((m, i) => (
            <button
              key={m.id}
              onClick={() => jumpTo(i)}
              aria-label={courtLabel(session, m.courtNumber)}
              className="flex h-5 items-center"
            >
              <motion.span
                className={`block h-1.5 rounded-full ${
                  i === active ? (live && !m.completed ? "bg-live" : "bg-lime") : "bg-surface-highest"
                }`}
                animate={{ width: i === active ? 22 : 6 }}
                transition={SPRING}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchCard({
  sessionId,
  session,
  match: m,
  live,
  reshuffling,
  setReshuffling,
  replacePlayer,
  editing,
  editScores,
  setEditScores,
  editScoreError,
  savingScore,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onReopen,
}: {
  sessionId: string;
  session: SessionDto;
  match: MatchDto;
  live: boolean;
  reshuffling: { matchId: string; slot: MatchSlot } | null;
  setReshuffling: (v: { matchId: string; slot: MatchSlot } | null) => void;
  replacePlayer: (matchId: string, slot: MatchSlot, playerId: string) => void;
  editing: boolean;
  editScores: { team1: number; team2: number };
  setEditScores: React.Dispatch<React.SetStateAction<{ team1: number; team2: number }>>;
  editScoreError: string;
  savingScore: boolean;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onReopen: () => void;
}) {
  const setMode = session.scoringMode === "SET";
  const s1 = setMode ? m.team1Games : m.team1Score;
  const s2 = setMode ? m.team2Games : m.team2Score;
  const server = servingPlayer(m);
  const roster = session.players.map((sp) => sp.player);
  const title = m.completed
    ? computeMatchTitle(
        session.scoringMode,
        s1,
        s2,
        setMode ? session.gamesPerSet : session.pointsPerMatch
      )
    : null;

  const rows = [
    { slots: ["team1Player1", "team1Player2"] as const, score: s1, ahead: s1 > s2, key: "team1" as const },
    { slots: ["team2Player1", "team2Player2"] as const, score: s2, ahead: s2 > s1, key: "team2" as const },
  ];

  return (
    <div
      className={`overflow-hidden rounded-3xl border transition-colors duration-500 ${
        live ? "border-lime/60 bg-surface" : "border-outline bg-surface"
      }`}
    >
      <div className="flex items-center justify-between px-5 pt-4">
        <span className="font-heading text-2xl font-extrabold uppercase text-ink">
          {courtLabel(session, m.courtNumber)}
        </span>
        {live ? (
          <span className="flex items-center gap-2 rounded-full bg-live-bg px-3 py-1 font-heading text-sm font-bold uppercase tracking-wider text-live">
            <span className="live-dot" />
            Live
          </span>
        ) : m.completed ? (
          <span className="flex items-center gap-1.5 font-heading text-sm font-bold uppercase tracking-wider text-ink-muted">
            <span className="material-symbols-outlined text-base">check_circle</span>
            Final
          </span>
        ) : (
          <span className="font-heading text-sm font-bold uppercase tracking-wider text-ink-muted">
            Scheduled
          </span>
        )}
      </div>

      <div className="px-5 pb-2 pt-3">
        {rows.map((row, i) => (
          <div
            key={row.key}
            className={`flex items-center gap-3 py-2 ${i === 0 ? "border-b border-outline" : ""}`}
          >
            <div
              className={`min-w-0 flex-1 text-lg font-semibold leading-snug transition-colors duration-500 ${
                row.ahead || (!m.completed && s1 === s2) ? "text-ink" : "text-ink-muted"
              }`}
            >
              {row.slots.map((slot) => (
                <div key={slot} className="flex items-center gap-2">
                  <PlayerChip
                    match={m}
                    slot={slot}
                    roster={roster}
                    open={reshuffling?.matchId === m.id && reshuffling.slot === slot}
                    onOpen={() => setReshuffling({ matchId: m.id, slot })}
                    onClose={() => setReshuffling(null)}
                    onPick={(playerId) => replacePlayer(m.id, slot, playerId)}
                  />
                  {!m.completed && server.id === m[slot].id && (
                    <motion.span
                      layoutId={`serve-${m.id}`}
                      transition={SPRING}
                      className="inline-block h-2 w-2 shrink-0 rounded-full bg-lime"
                      aria-label="Serving"
                    />
                  )}
                </div>
              ))}
            </div>
            {editing ? (
              <input
                autoFocus={i === 0}
                type="number"
                value={editScores[row.key]}
                onChange={(e) =>
                  setEditScores((s) => ({ ...s, [row.key]: Number(e.target.value) }))
                }
                className="w-20 rounded-xl border border-lime bg-surface-low px-2 py-1 text-center font-heading text-4xl font-black tabular-nums text-ink"
              />
            ) : (
              <RollingNumber
                value={row.score}
                className={`font-heading text-6xl font-black transition-colors duration-500 ${
                  row.ahead ? "text-lime" : "text-ink"
                }`}
              />
            )}
          </div>
        ))}
        {editing && editScoreError && (
          <p className="pb-1 text-right text-xs text-live">{editScoreError}</p>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-outline bg-surface-low px-4 py-3">
        {editing ? (
          <>
            <button
              onClick={onCancelEdit}
              className="pressable flex-1 rounded-xl bg-surface-high py-3 text-sm font-semibold text-ink"
            >
              Cancel
            </button>
            <button
              onClick={onSaveEdit}
              disabled={savingScore}
              className="pressable flex flex-1 items-center justify-center gap-2 rounded-xl bg-lime py-3 text-sm font-bold text-on-lime disabled:opacity-40"
            >
              {savingScore ? <Spinner className="text-lg" /> : "Save final score"}
            </button>
          </>
        ) : !m.completed ? (
          <>
            <button
              onClick={onStartEdit}
              aria-label="Edit score"
              className="pressable flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-high text-ink"
            >
              <span className="material-symbols-outlined">edit</span>
            </button>
            <Link
              href={`/session/${sessionId}/match/${m.id}`}
              className="pressable flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-lime font-heading text-lg font-extrabold uppercase tracking-wide text-on-lime"
            >
              <span className="material-symbols-outlined text-xl">scoreboard</span>
              Scoreboard
            </Link>
          </>
        ) : (
          <>
            {title && (
              <span className="rounded-full bg-live-bg px-3 py-1 font-heading text-sm font-bold uppercase tracking-wider text-live">
                {title}
              </span>
            )}
            <span className="flex-1" />
            <button
              onClick={onReopen}
              className="pressable flex items-center gap-1 rounded-xl bg-surface-high px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-muted"
            >
              <span className="material-symbols-outlined text-base">undo</span>
              Reopen
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ActionSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-t-[28px] border border-outline bg-surface p-3 pb-8"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 500) onClose();
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-surface-highest" />
            <div className="stagger flex flex-col">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SheetItem({
  icon,
  label,
  href,
  newTab,
  onClick,
  danger,
}: {
  icon: string;
  label: string;
  href?: string;
  newTab?: boolean;
  onClick?: () => void;
  danger?: boolean;
}) {
  const className = `pressable flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-base ${
    danger ? "text-live" : "text-ink"
  } active:bg-surface-high`;
  const content = (
    <>
      <span className={`material-symbols-outlined ${danger ? "text-live" : "text-ink-muted"}`}>
        {icon}
      </span>
      {label}
    </>
  );
  return href ? (
    <Link href={href} target={newTab ? "_blank" : undefined} className={className}>
      {content}
    </Link>
  ) : (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
}
