"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { computeRanks, sortStandings, type StandingRow } from "@/lib/types";
import { Avatar } from "./Avatar";
import { RollingNumber } from "./RollingNumber";

const SPRING = { type: "spring", stiffness: 380, damping: 32 } as const;
const MEDAL = ["#f7cf4f", "#d5dce3", "#dd8f45"];
const CONFETTI = ["#d4ff3a", "#ff7a1a", "#3af0ff", "#ff5fa2", "#ffd75e", "#ffffff"];

function Streak({ n }: { n: number }) {
  if (n < 3) return null;
  return (
    <span className="streak-badge flex-shrink-0">
      <span className="streak-flame" />
      <span className="font-heading text-[11px] font-extrabold tracking-wide text-flame-ink tabular-nums">
        {n}x
      </span>
    </span>
  );
}

// Rolls up from 0 to the value shortly after it first appears.
function CountUp({ value, className, delay = 400 }: { value: number; className?: string; delay?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return <RollingNumber value={shown} className={className} />;
}

// One-off confetti burst from the champion's block. Keyed by the leader, so
// a new leader gets a new celebration.
function Confetti() {
  const pieces = Array.from({ length: 26 }, (_, i) => {
    const angle = (-90 + (i / 25) * 180 - 90) * (Math.PI / 180) + (i % 3) * 0.12;
    const dist = 90 + ((i * 37) % 70);
    return {
      i,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - 30,
      rot: ((i * 53) % 360) - 180,
      color: CONFETTI[i % CONFETTI.length],
      w: i % 2 ? 6 : 4,
      h: i % 2 ? 10 : 6,
    };
  });
  return (
    <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-10 z-20">
      {pieces.map((p) => (
        <motion.span
          key={p.i}
          className="absolute rounded-[2px]"
          style={{ width: p.w, height: p.h, background: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 120], opacity: [1, 1, 0], rotate: p.rot * 3, scale: 1 }}
          transition={{ duration: 1.6, delay: 0.75, ease: [0.22, 1, 0.36, 1], times: [0, 0.4, 1] }}
        />
      ))}
    </div>
  );
}

// Top 3 on stepped blocks (2nd, 1st, 3rd): avatars bounce in, the champion
// gets a dropping crown, spotlights and a confetti burst, scores roll up.
function Podium({ top3, ranks }: { top3: StandingRow[]; ranks: number[] }) {
  const order = [
    { row: top3[1], place: 2, rank: ranks[1], h: 92, size: 54, delay: 0.25 },
    { row: top3[0], place: 1, rank: ranks[0], h: 132, size: 72, delay: 0.5 },
    { row: top3[2], place: 3, rank: ranks[2], h: 72, size: 50, delay: 0.1 },
  ];
  const champion = top3[0];
  return (
    <div className="relative mb-6 pt-8">
      <span aria-hidden="true" className="spotlight spotlight-l" />
      <span aria-hidden="true" className="spotlight spotlight-r" />
      {champion.score > 0 && <Confetti key={champion.playerId} />}
      <div className="relative flex items-end gap-2">
        {order.map(({ row, place, rank, h, size, delay }) => (
          <div key={row.playerId} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="relative mb-2 flex w-full flex-col items-center text-center">
              {place === 1 && (
                <motion.span
                  aria-hidden="true"
                  className="material-symbols-outlined absolute -top-10 z-10 text-5xl text-[#f7cf4f] drop-shadow-[0_4px_10px_rgba(247,207,79,0.6)]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  initial={{ y: -60, opacity: 0, rotate: -30 }}
                  animate={{ y: 0, opacity: 1, rotate: [-30, 12, -6, 0] }}
                  transition={{
                    y: { type: "spring", stiffness: 260, damping: 12, delay: delay + 0.35 },
                    opacity: { duration: 0.2, delay: delay + 0.35 },
                    rotate: { duration: 0.9, ease: "easeOut", delay: delay + 0.35 },
                  }}
                >
                  crown
                </motion.span>
              )}
              <motion.div
                initial={{ scale: 0, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 340, damping: 14, delay }}
              >
                <Avatar name={row.name} size={size} ring={MEDAL[rank - 1]} />
              </motion.div>
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delay + 0.15, duration: 0.4 }}
                className="mt-2 w-full truncate font-heading text-base font-bold uppercase leading-tight text-ink"
              >
                {row.name}
              </motion.span>
              <span className="mt-0.5">
                <Streak n={row.winStreak} />
              </span>
            </div>
            <motion.div
              className={`relative flex w-full flex-col items-center justify-start overflow-hidden rounded-t-2xl pt-2 ${
                place === 1 ? "bg-lime text-on-lime" : "bg-surface-high text-ink"
              }`}
              initial={{ height: 0 }}
              animate={{ height: h }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: delay - 0.1 }}
            >
              {place === 1 && <span aria-hidden="true" className="card-sweep" />}
              <span className="relative font-heading text-4xl font-black leading-none">{rank}</span>
              <CountUp
                value={row.score}
                delay={700 + delay * 1000}
                className="relative mt-1 font-heading text-lg font-extrabold opacity-80"
              />
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
}

type Snapshot = { sig: string; pos: Record<string, number>; moves: Record<string, number> };

export function StandingsTable({
  rows,
  scoreLabel = "Score",
}: {
  rows: StandingRow[];
  scoreLabel?: string;
}) {
  const sorted = sortStandings(rows);
  const ranks = computeRanks(sorted);
  const maxScore = Math.max(1, ...sorted.map((r) => r.score));
  const [expanded, setExpanded] = useState<string | null>(null);

  // Remember each player's previous position so a re-sort can show ▲/▼.
  // Derived during render (React's "store info from previous renders"
  // pattern) instead of in an effect, so the arrows appear with the reorder.
  const sig = sorted.map((r) => r.playerId).join(",");
  const pos = Object.fromEntries(sorted.map((r, i) => [r.playerId, i]));
  const [snap, setSnap] = useState<Snapshot>({ sig, pos, moves: {} });
  if (snap.sig !== sig) {
    const moves: Record<string, number> = {};
    for (const r of sorted) {
      const before = snap.pos[r.playerId];
      if (before !== undefined && before !== pos[r.playerId]) moves[r.playerId] = before - pos[r.playerId];
    }
    setSnap({ sig, pos, moves });
  }

  return (
    <div>
      {sorted.length >= 3 && <Podium top3={sorted.slice(0, 3)} ranks={ranks} />}

      <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        <span>Race</span>
        <span>{scoreLabel}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {sorted.map((r, idx) => {
          const move = snap.moves[r.playerId] ?? 0;
          const open = expanded === r.playerId;
          const rank = ranks[idx];
          const climbed = move > 0;
          return (
            <motion.div
              layout
              key={r.playerId}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={SPRING}
              className={`row-hover overflow-hidden rounded-2xl bg-surface ${
                r.winStreak >= 3 ? "streak-row" : ""
              } ${rank === 1 ? "ring-1 ring-[#f7cf4f]/40" : ""}`}
            >
              {/* A lime flash sweeps across a row that just climbed. */}
              <AnimatePresence>
                {climbed && (
                  <motion.span
                    key={`${snap.sig}-flash`}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-transparent via-lime/25 to-transparent"
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
              </AnimatePresence>
              <button
                onClick={() => setExpanded(open ? null : r.playerId)}
                className="relative flex w-full items-center gap-3 px-3 py-2.5 text-left"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-heading text-lg font-black leading-none"
                  style={
                    rank <= 3
                      ? { background: MEDAL[rank - 1], color: "#0b0d0c" }
                      : { color: "var(--color-ink-muted)" }
                  }
                >
                  {rank}
                </span>
                <Avatar name={r.name} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-base font-semibold text-ink">{r.name}</span>
                    <Streak n={r.winStreak} />
                    <AnimatePresence>
                      {move !== 0 && (
                        <motion.span
                          key={`${snap.sig}-${r.playerId}`}
                          initial={{ scale: 0.3, opacity: 0, y: move > 0 ? 8 : -8 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 14 }}
                          className={`shrink-0 text-xs font-bold ${move > 0 ? "text-lime" : "text-live"}`}
                        >
                          {move > 0 ? `▲${move}` : `▼${-move}`}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-highest">
                    <motion.span
                      className="block h-full rounded-full bg-lime"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(Math.max(r.score, 0) / maxScore) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 + 0.04 * idx }}
                    />
                  </span>
                </span>
                <RollingNumber value={r.score} className="shrink-0 font-heading text-3xl font-black text-ink" />
                <motion.span
                  animate={{ rotate: open ? 180 : 0 }}
                  transition={SPRING}
                  className="material-symbols-outlined shrink-0 text-ink-muted"
                >
                  expand_more
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="grid grid-cols-3 gap-1.5 px-3 pb-3">
                      <Stat label="W-T-L" value={`${r.wins}-${r.ties}-${r.losses}`} />
                      <Stat
                        label="SD"
                        value={r.sd > 0 ? `+${r.sd}` : String(r.sd)}
                        tone={r.sd > 0 ? "text-lime-dim" : r.sd < 0 ? "text-live" : undefined}
                      />
                      <Stat label="+M bonus" value={r.mBonus ? `+${r.mBonus}` : "0"} />
                      <Stat label="Played" value={String(r.played)} />
                      <Stat label="Pts +/−" value={`${r.pointsFor} / ${r.pointsAgainst}`} />
                      <Stat label="Missed rds" value={String(r.missedRounds)} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-surface-low px-2.5 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</div>
      <div className={`font-heading text-xl font-extrabold tabular-nums ${tone ?? "text-ink"}`}>{value}</div>
    </div>
  );
}
