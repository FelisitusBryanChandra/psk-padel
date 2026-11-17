"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { computeRanks, sortStandings, type StandingRow } from "@/lib/types";
import { RollingNumber } from "./RollingNumber";

const SPRING = { type: "spring", stiffness: 380, damping: 32 } as const;
const MEDAL = ["#f7cf4f", "#d5dce3", "#dd8f45"];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w[0]));
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

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

// Top 3 as stepped podium blocks (2nd, 1st, 3rd) that spring up from the floor.
// The number shown is the competition rank, so a tie for 1st reads "1, 1".
function Podium({ top3, ranks }: { top3: StandingRow[]; ranks: number[] }) {
  const order = [
    { row: top3[1], place: 2, rank: ranks[1], h: 92 },
    { row: top3[0], place: 1, rank: ranks[0], h: 132 },
    { row: top3[2], place: 3, rank: ranks[2], h: 72 },
  ];
  return (
    <div className="mb-5 flex items-end gap-2 pt-2">
      {order.map(({ row, place, rank, h }) => (
        <div key={row.playerId} className="flex min-w-0 flex-1 flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.25 + place * 0.08 }}
            className="mb-2 flex w-full flex-col items-center text-center"
          >
            <span
              className={`flex items-center justify-center rounded-full font-heading font-black ${
                place === 1 ? "h-14 w-14 bg-lime text-xl text-on-lime" : "h-11 w-11 bg-surface-highest text-base text-ink"
              }`}
              style={{ boxShadow: `0 0 0 3px ${MEDAL[rank - 1]}` }}
            >
              {initials(row.name)}
            </span>
            <span className="mt-1.5 w-full truncate font-heading text-base font-bold uppercase leading-tight text-ink">
              {row.name}
            </span>
            <span className="mt-0.5">
              <Streak n={row.winStreak} />
            </span>
          </motion.div>
          <motion.div
            className={`flex w-full flex-col items-center justify-start rounded-t-2xl pt-2 ${
              place === 1 ? "bg-lime text-on-lime" : "bg-surface-high text-ink"
            }`}
            initial={{ height: 0 }}
            animate={{ height: h }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: place * 0.08 }}
          >
            <span className="font-heading text-4xl font-black leading-none">{rank}</span>
            <RollingNumber
              value={row.score}
              className="mt-1 font-heading text-lg font-extrabold opacity-80"
            />
          </motion.div>
        </div>
      ))}
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
              }`}
            >
              <button
                onClick={() => setExpanded(open ? null : r.playerId)}
                className="flex w-full items-center gap-3 px-3 py-3 text-left"
              >
                <span
                  className="w-7 shrink-0 text-center font-heading text-2xl font-black leading-none"
                  style={{ color: rank <= 3 ? MEDAL[rank - 1] : "var(--color-ink-muted)" }}
                >
                  {rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-base font-semibold text-ink">{r.name}</span>
                    <Streak n={r.winStreak} />
                    <AnimatePresence>
                      {move !== 0 && (
                        <motion.span
                          key={`${snap.sig}-${r.playerId}`}
                          initial={{ scale: 0.3, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 18 }}
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
                      animate={{ width: `${(Math.max(r.score, 0) / maxScore) * 100}%` }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.05 * idx }}
                    />
                  </span>
                </span>
                <RollingNumber
                  value={r.score}
                  className="shrink-0 font-heading text-3xl font-black text-ink"
                />
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
