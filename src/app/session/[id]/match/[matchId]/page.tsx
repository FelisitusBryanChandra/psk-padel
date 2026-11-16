"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, animate, motion, useAnimate, useMotionValue } from "motion/react";
import { cycleServe, nextServeState, servingPlayerId, type ServeState } from "@/lib/serve";
import { applyPoint, isTiebreak, pointLabel } from "@/lib/tennisScore";
import { Spinner } from "@/app/Spinner";
import { LoadingModal } from "@/app/LoadingModal";
import { RollingNumber } from "@/app/RollingNumber";
import { rememberFinishedMatch } from "@/lib/lastFinishedMatch";
import { readRespectMaxPoints } from "@/lib/settings";
import { courtLabel, type MatchDto, type SessionDto } from "@/lib/types";

type LiveState = {
  team1Score: number;
  team2Score: number;
  team1Games: number;
  team2Games: number;
  team1GamePoints: number;
  team2GamePoints: number;
} & ServeState;

type SessionConfig = Pick<
  SessionDto,
  "pointsPerServe" | "pointsPerMatch" | "scoringMode" | "gamesPerSet" | "goldenPoint" | "courtNames"
>;

const SPRING = { type: "spring", stiffness: 420, damping: 32 } as const;

export default function ScoreboardPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const { id, matchId } = use(params);
  const router = useRouter();

  const [match, setMatch] = useState<MatchDto | null>(null);
  const [session, setSession] = useState<SessionConfig | null>(null);
  const [live, setLive] = useState<LiveState>({
    team1Score: 0,
    team2Score: 0,
    team1Games: 0,
    team2Games: 0,
    team1GamePoints: 0,
    team2GamePoints: 0,
    servingTeam: 1,
    team1ServerSlot: 1,
    team2ServerSlot: 1,
  });
  const [finishing, setFinishing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [swapped, setSwapped] = useState(false);
  // Set once a point locally completes the match (Respect max points is on
  // and a side just reached the games target) -- the finalize call runs in
  // the background, and this switches to the same "finished" view a match
  // that was already completed on load shows, without waiting on a refetch.
  const [justFinished, setJustFinished] = useState(false);
  // Snapshots taken before each awarded point, in both scoring modes. A
  // tennis point can't be undone by decrementing (it may have rolled a game
  // or flipped serve), so only the whole prior state restores it; Points
  // mode uses the same stack so undo also restores serve rotation.
  const [pointHistory, setPointHistory] = useState<LiveState[]>([]);

  useEffect(() => {
    fetch(`/api/sessions/${id}`)
      .then((r) => r.json())
      .then((data: SessionDto) => {
        setSession({
          pointsPerServe: data.pointsPerServe,
          pointsPerMatch: data.pointsPerMatch,
          scoringMode: data.scoringMode,
          gamesPerSet: data.gamesPerSet,
          goldenPoint: data.goldenPoint,
          courtNames: data.courtNames,
        });
        const found = data.rounds.flatMap((r) => r.matches).find((m) => m.id === matchId);
        if (found) {
          setMatch(found);
          setLive({
            team1Score: found.team1Score,
            team2Score: found.team2Score,
            team1Games: found.team1Games,
            team2Games: found.team2Games,
            team1GamePoints: found.team1GamePoints,
            team2GamePoints: found.team2GamePoints,
            servingTeam: found.servingTeam,
            team1ServerSlot: found.team1ServerSlot,
            team2ServerSlot: found.team2ServerSlot,
          });
        }
      });
  }, [id, matchId]);

  // Points mode: awards one point. Race-to-N is a shared target: every point
  // comes off the other team, so the cap is on team1Score + team2Score
  // together (e.g. 11-10 at a cap of 21), not on each side independently.
  // Returns false when the cap blocked the point.
  function addPoint(team: 1 | 2): boolean {
    const cap = readRespectMaxPoints() ? (session?.pointsPerMatch ?? Infinity) : Infinity;
    const prevTotal = live.team1Score + live.team2Score;
    if (prevTotal >= cap) return false;
    const team1Score = team === 1 ? live.team1Score + 1 : live.team1Score;
    const team2Score = team === 2 ? live.team2Score + 1 : live.team2Score;
    const serve = nextServeState(live, prevTotal, prevTotal + 1, session?.pointsPerServe ?? 5);
    setPointHistory((h) => [...h, live]);
    // `serve` may just be `live` unchanged (including its old scores) when
    // no boundary was crossed, so it must spread BEFORE the fresh scores.
    setLive({ ...live, ...serve, team1Score, team2Score });
    return true;
  }

  // Points mode minus, same as master's − stepper: takes one point off that
  // team (never below 0) and re-derives serve rotation from the new total.
  function removePoint(team: 1 | 2) {
    const prevTotal = live.team1Score + live.team2Score;
    const team1Score = team === 1 ? Math.max(0, live.team1Score - 1) : live.team1Score;
    const team2Score = team === 2 ? Math.max(0, live.team2Score - 1) : live.team2Score;
    if (team1Score === live.team1Score && team2Score === live.team2Score) return;
    const serve = nextServeState(live, prevTotal, team1Score + team2Score, session?.pointsPerServe ?? 5);
    setPointHistory((h) => [...h, live]);
    setLive({ ...live, ...serve, team1Score, team2Score });
  }

  // Set mode: awards one tennis point. Returns false when blocked.
  function scorePoint(team: 1 | 2): boolean {
    if (!match || !session) return false;
    const cap = readRespectMaxPoints();
    // gamesPerSet is a shared target on the combined games played, so block
    // further scoring once team1Games + team2Games reaches it, tied or not.
    if (cap && live.team1Games + live.team2Games >= session.gamesPerSet) {
      return false;
    }
    setPointHistory((h) => [...h, live]);
    const result = applyPoint(live, team, {
      gamesPerSet: session.gamesPerSet,
      goldenPoint: session.goldenPoint,
    });
    setLive((prev) => ({ ...prev, ...result }));
    if (cap && result.setComplete) {
      void finalizeInBackground(result.team1Games, result.team2Games);
    }
    return true;
  }

  async function finalizeInBackground(team1Games: number, team2Games: number) {
    if (!match) return;
    setJustFinished(true);
    await fetch(`/api/matches/${match.id}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team1Games, team2Games }),
    });
    rememberFinishedMatch(match.id);
  }

  function undoPoint(): boolean {
    const previous = pointHistory.at(-1);
    if (!previous) return false;
    setLive(previous);
    setPointHistory((h) => h.slice(0, -1));
    return true;
  }

  async function finish() {
    if (!match || !session) return;
    setFinishing(true);
    const body =
      session.scoringMode === "SET"
        ? { team1Games: live.team1Games, team2Games: live.team2Games }
        : { team1Score: live.team1Score, team2Score: live.team2Score };
    await fetch(`/api/matches/${match.id}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    rememberFinishedMatch(match.id);
    router.back();
  }

  async function saveProgress() {
    if (!match || !session) return;
    setUpdating(true);
    const serveFields = {
      servingTeam: live.servingTeam,
      team1ServerSlot: live.team1ServerSlot,
      team2ServerSlot: live.team2ServerSlot,
    };
    const body =
      session.scoringMode === "SET"
        ? {
            team1Games: live.team1Games,
            team2Games: live.team2Games,
            team1GamePoints: live.team1GamePoints,
            team2GamePoints: live.team2GamePoints,
            ...serveFields,
          }
        : { team1Score: live.team1Score, team2Score: live.team2Score, ...serveFields };
    await fetch(`/api/matches/${match.id}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setUpdating(false);
  }

  if (!match || !session) {
    return <LoadingModal open />;
  }

  const setMode = session.scoringMode === "SET";

  if (match.completed || justFinished) {
    const s1 = setMode ? live.team1Games : live.team1Score;
    const s2 = setMode ? live.team2Games : live.team2Score;
    const winner =
      s1 === s2
        ? null
        : s1 > s2
          ? `${match.team1Player1.name} & ${match.team1Player2.name}`
          : `${match.team2Player1.name} & ${match.team2Player2.name}`;
    return (
      <main className="relative flex min-h-dvh flex-col items-center justify-center gap-5 overflow-hidden px-6 text-center">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            className="absolute h-64 w-64 rounded-full border-2 border-lime"
            initial={{ scale: 0.2, opacity: 0.8 }}
            animate={{ scale: 3.2, opacity: 0 }}
            transition={{ duration: 1.8, delay: i * 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
        <motion.p
          initial={{ opacity: 0, y: 12, letterSpacing: "0.6em" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "0.2em" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="font-heading text-lg font-extrabold uppercase text-lime"
        >
          Finished
        </motion.p>
        <motion.p
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
          className="font-heading text-[7rem] font-black leading-none text-ink tabular-nums"
        >
          {s1}
          <span className="text-ink-muted">–</span>
          {s2}
        </motion.p>
        {winner && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="font-heading text-2xl font-bold uppercase text-ink"
          >
            {winner} win
          </motion.p>
        )}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          onClick={() => {
            rememberFinishedMatch(match.id);
            router.back();
          }}
          className="pressable mt-2 rounded-2xl bg-lime px-8 py-3 font-heading text-lg font-extrabold uppercase tracking-wide text-on-lime"
        >
          Back to session
        </motion.button>
      </main>
    );
  }

  const server = servingPlayerId(live, {
    team1Player1Id: match.team1Player1.id,
    team1Player2Id: match.team1Player2.id,
    team2Player1Id: match.team2Player1.id,
    team2Player2Id: match.team2Player2.id,
  });
  const tiebreakNow = setMode && isTiebreak(live, session.gamesPerSet);

  // Which side is ahead: games first in Set mode, then the in-game points.
  const diff = setMode
    ? live.team1Games - live.team2Games || live.team1GamePoints - live.team2GamePoints
    : live.team1Score - live.team2Score;

  const teams = ([1, 2] as const).map((team) => {
    const p1 = team === 1 ? match.team1Player1 : match.team2Player1;
    const p2 = team === 1 ? match.team1Player2 : match.team2Player2;
    const own = team === 1 ? live.team1GamePoints : live.team2GamePoints;
    const other = team === 1 ? live.team2GamePoints : live.team1GamePoints;
    return {
      team,
      names: [p1.name, p2.name] as const,
      serverName: server === p1.id ? p1.name : server === p2.id ? p2.name : null,
      score: team === 1 ? live.team1Score : live.team2Score,
      games: team === 1 ? live.team1Games : live.team2Games,
      pointText: setMode ? pointLabel(own, other, tiebreakNow, session.goldenPoint) : "",
      leading: team === 1 ? diff > 0 : diff < 0,
    };
  });
  const ordered = swapped ? [teams[1], teams[0]] : teams;

  return (
    <main className="landscape-force flex h-dvh flex-col bg-bg">
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={() => {
            rememberFinishedMatch(match.id);
            router.back();
          }}
          aria-label="Back to session"
          className="pressable flex h-9 w-9 items-center justify-center rounded-xl bg-surface-high text-ink"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="font-heading text-xl font-extrabold uppercase tracking-wide text-ink">
            {courtLabel(session, match.courtNumber)}
          </span>
          <motion.button
            onClick={() => setSwapped((s) => !s)}
            aria-label="Switch sides"
            whileTap={{ scale: 0.85, rotate: 180 }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-high text-ink"
          >
            <span className="material-symbols-outlined text-xl">swap_horiz</span>
          </motion.button>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-live-bg px-3 py-1 font-heading text-sm font-bold uppercase tracking-wider text-live">
          <span className="live-dot" />
          {tiebreakNow ? "Tiebreak" : "Live"}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 gap-1 px-1">
        {ordered.map((t) => (
          <TeamHalf
            key={t.team}
            names={t.names}
            serverName={t.serverName}
            leading={t.leading}
            setMode={setMode}
            score={t.score}
            games={t.games}
            pointText={t.pointText}
            onScore={() => (setMode ? scorePoint(t.team) : addPoint(t.team))}
            onUndo={undoPoint}
            onMinus={setMode ? undefined : () => removePoint(t.team)}
            onServe={() => setLive((prev) => ({ ...prev, ...cycleServe(prev) }))}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 px-4 py-2">
        <button
          onClick={undoPoint}
          disabled={pointHistory.length === 0}
          className="pressable flex items-center gap-1.5 rounded-xl bg-surface-high px-4 py-2.5 font-heading text-base font-bold uppercase tracking-wide text-ink disabled:opacity-30"
        >
          <span className="material-symbols-outlined text-lg">undo</span>
          Undo
        </button>
        <span className="flex-1 text-center text-xs text-ink-muted">
          Tap a side to score · swipe down to undo
        </span>
        <button
          onClick={saveProgress}
          disabled={updating}
          className="pressable flex items-center gap-1.5 rounded-xl bg-surface-high px-4 py-2.5 font-heading text-base font-bold uppercase tracking-wide text-ink disabled:opacity-40"
        >
          {updating ? <Spinner className="text-lg" /> : <span className="material-symbols-outlined text-lg">cloud_upload</span>}
          {updating ? "Saving" : "Update"}
        </button>
        <button
          onClick={finish}
          disabled={finishing}
          className="pressable flex items-center gap-1.5 rounded-xl bg-live px-4 py-2.5 font-heading text-base font-bold uppercase tracking-wide text-white disabled:opacity-40"
        >
          {finishing ? <Spinner className="text-lg" /> : <span className="material-symbols-outlined text-lg">flag</span>}
          {finishing ? "Saving" : "Finish"}
        </button>
      </div>
    </main>
  );
}

type Burst = { id: number; x: number; y: number };

// One team's half of the court. The whole half is the score button: tap to
// add a point, drag down past the threshold to undo. Gesture math runs in
// the half's own coordinates, which differ from the screen's when
// .landscape-force has rotated the page 90deg on a portrait phone.
function TeamHalf({
  names,
  serverName,
  leading,
  setMode,
  score,
  games,
  pointText,
  onScore,
  onUndo,
  onMinus,
  onServe,
}: {
  onMinus?: () => void;
  names: readonly [string, string];
  serverName: string | null;
  leading: boolean;
  setMode: boolean;
  score: number;
  games: number;
  pointText: string;
  onScore: () => boolean;
  onUndo: () => boolean;
  onServe: () => void;
}) {
  const [scope, animateScope] = useAnimate<HTMLDivElement>();
  const dragY = useMotionValue(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const nextBurst = useRef(0);

  function isRotated() {
    return window.matchMedia("(max-width: 900px) and (orientation: portrait)").matches;
  }

  // Screen-space pointer delta -> this half's own (possibly rotated) axes.
  function localDelta(e: React.PointerEvent) {
    const s = start.current!;
    const sx = e.clientX - s.x;
    const sy = e.clientY - s.y;
    return isRotated() ? { dx: sy, dy: -sx } : { dx: sx, dy: sy };
  }

  function localPoint(e: React.PointerEvent) {
    const r = scope.current!.getBoundingClientRect();
    return isRotated()
      ? { x: e.clientY - r.top, y: r.right - e.clientX }
      : { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-no-score]")) return;
    start.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!start.current) return;
    dragY.set(Math.max(0, localDelta(e).dy) * 0.35);
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!start.current) return;
    const { dx, dy } = localDelta(e);
    const point = localPoint(e);
    start.current = null;
    animate(dragY, 0, { type: "spring", stiffness: 500, damping: 30 });

    if (dy > 70) {
      if (onUndo()) navigator.vibrate?.([8, 40, 8]);
      return;
    }
    if (Math.abs(dx) > 14 || Math.abs(dy) > 14) return;

    if (onScore()) {
      const id = nextBurst.current++;
      setBursts((b) => [...b, { id, ...point }]);
      setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 750);
      navigator.vibrate?.(12);
    } else {
      animateScope(scope.current!, { x: [0, -12, 12, -7, 7, 0] }, { duration: 0.4 });
      navigator.vibrate?.([20, 30, 20]);
    }
  }

  return (
    <motion.div
      ref={scope}
      layout
      transition={SPRING}
      style={{ y: dragY, containerType: "size", touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        start.current = null;
        animate(dragY, 0, SPRING);
      }}
      className={`relative flex min-w-0 flex-1 cursor-pointer select-none flex-col overflow-hidden rounded-3xl px-5 py-4 transition-colors duration-500 ${
        leading ? "bg-lime text-on-lime" : "bg-surface-high text-ink"
      }`}
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {names.map((n) => (
            <p
              key={n}
              className="truncate font-heading text-[clamp(1rem,9cqh,1.75rem)] font-extrabold uppercase leading-[1.05]"
            >
              {n}
              {serverName === n && (
                <motion.span
                  layoutId="serve-ball"
                  transition={SPRING}
                  className="ml-2 inline-block h-[0.45em] w-[0.45em] rounded-full bg-current align-middle"
                />
              )}
            </p>
          ))}
        </div>
        <button
          data-no-score
          onClick={onServe}
          aria-label="Switch serve to this side"
          className={`pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            leading ? "bg-on-lime/10" : "bg-surface-highest"
          }`}
        >
          <span
            className="material-symbols-outlined text-xl"
            style={serverName ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            sports_tennis
          </span>
        </button>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center">
        {setMode ? (
          <div className="flex flex-col items-center">
            <div className="relative h-[46cqh] overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={pointText}
                  initial={{ y: "70%", opacity: 0, scale: 0.8 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: "-70%", opacity: 0, scale: 0.8 }}
                  transition={SPRING}
                  className="block font-heading text-[46cqh] font-black leading-none"
                >
                  {pointText}
                </motion.span>
              </AnimatePresence>
            </div>
            <span className="mt-1 font-heading text-[clamp(1rem,8cqh,1.6rem)] font-bold uppercase tracking-wider opacity-70">
              Games <RollingNumber value={games} className="align-[-0.12em]" />
            </span>
          </div>
        ) : (
          <RollingNumber value={score} className="font-heading text-[60cqh] font-black" />
        )}
      </div>

      {onMinus && (
        <button
          data-no-score
          onClick={onMinus}
          aria-label="Remove a point"
          className={`pressable absolute bottom-3 left-3 z-10 flex h-11 w-11 items-center justify-center rounded-xl ${
            leading ? "bg-on-lime/10" : "bg-surface-highest"
          }`}
        >
          <span className="material-symbols-outlined text-2xl">remove</span>
        </button>
      )}

      <AnimatePresence>
        {bursts.map((b) => (
          <motion.span key={b.id} className="pointer-events-none absolute" style={{ left: b.x, top: b.y }}>
            <motion.span
              className="absolute -left-24 -top-24 h-48 w-48 rounded-full bg-current"
              initial={{ scale: 0, opacity: 0.25 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.span
              className="absolute -left-6 -top-10 font-heading text-3xl font-black"
              initial={{ y: 0, opacity: 1, scale: 0.7 }}
              animate={{ y: -60, opacity: 0, scale: 1.3 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              +1
            </motion.span>
          </motion.span>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
