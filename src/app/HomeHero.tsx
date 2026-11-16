"use client";

import { motion } from "motion/react";
import { Logo } from "./Logo";
import { RollingNumber } from "./RollingNumber";
import { RiseLine } from "./RiseLine";
import type { SessionListItem } from "./SessionCard";
import { ThemeToggle } from "./ThemeToggle";

const SPRING = { type: "spring", stiffness: 420, damping: 30 } as const;

// Home header: oversized state-driven headline over a drifting outlined
// weekday, a rolling stat strip, and the Ongoing/Finished switch.
export function HomeHero({
  sessions,
  tab,
  onTab,
}: {
  sessions: SessionListItem[];
  tab: "ongoing" | "finished";
  onTab: (t: "ongoing" | "finished") => void;
}) {
  const now = new Date();
  const weekday = now.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase();
  const dateChip = now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

  const live = sessions.filter((s) => s.status === "LIVE");
  const open = sessions.filter((s) => s.status === null);
  const ongoing = sessions.filter((s) => s.status !== "COMPLETED").length;
  const finished = sessions.length - ongoing;
  const players = new Set(sessions.flatMap((s) => s.playerNames)).size;
  const courtsInPlay = live.reduce((n, s) => n + s.liveCourts.length, 0);

  const [line1, line2, sub] =
    live.length > 0
      ? ["MATCH", "DAY.", `${live.length} live · ${courtsInPlay} court${courtsInPlay === 1 ? "" : "s"} in play`]
      : open.length > 0
        ? ["GAME", "ON.", `${open.length} session${open.length === 1 ? "" : "s"} open for sign-up`]
        : ["READY TO", "PLAY?", "Start a session and get the courts going."];

  return (
    <header className="relative -mx-5 mb-6 overflow-hidden px-5 pb-2">
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 top-16 select-none whitespace-nowrap font-heading text-[9.5rem] font-black italic leading-none text-transparent"
        style={{ WebkitTextStroke: "1.5px color-mix(in srgb, var(--color-ink) 14%, transparent)" }}
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: [60, -40, 60], opacity: 1 }}
        transition={{
          x: { duration: 18, repeat: Infinity, ease: "easeInOut" },
          opacity: { duration: 1 },
        }}
      >
        {weekday}
      </motion.span>

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo className="h-7 w-auto text-lime" />
          <span className="font-heading text-xl font-black italic tracking-tight text-ink">
            PSK<span className="text-lime">/</span>PADEL
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-outline px-3 py-1.5 text-xs font-semibold text-ink-muted">
            {dateChip}
          </span>
          <ThemeToggle />
        </div>
      </div>

      <h1 className="relative mt-7 font-heading text-[5.2rem] font-black uppercase italic leading-[0.82] tracking-tight text-ink">
        <RiseLine text={line1} delay={0.05} />
        <RiseLine text={line2} delay={0.2} className="text-lime" />
      </h1>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="relative mt-3 flex items-center gap-2 text-sm text-ink-muted"
      >
        {live.length > 0 && <span className="live-dot text-live" />}
        {sub}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING, delay: 0.55 }}
        className="relative mt-6 grid grid-cols-3 divide-x divide-outline rounded-2xl border border-outline bg-surface/60 py-3 backdrop-blur"
      >
        {[
          { label: "Live now", value: live.length, hot: live.length > 0 },
          { label: "Sessions", value: sessions.length, hot: false },
          { label: "Players", value: players, hot: false },
        ].map((st) => (
          <div key={st.label} className="flex flex-col items-center">
            <RollingNumber
              value={st.value}
              className={`font-heading text-4xl font-black ${st.hot ? "text-lime" : "text-ink"}`}
            />
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              {st.label}
            </span>
          </div>
        ))}
      </motion.div>

      {sessions.length > 0 && (
        <div className="relative mt-5 flex gap-1 rounded-2xl bg-surface-high p-1">
          {(
            [
              ["ongoing", "Ongoing", ongoing],
              ["finished", "Finished", finished],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => onTab(key)}
              className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-heading text-lg font-extrabold uppercase tracking-wide transition-colors duration-300 ${
                tab === key ? "text-on-lime" : "text-ink-muted"
              }`}
            >
              {tab === key && (
                <motion.span
                  layoutId="home-tab"
                  className="absolute inset-0 rounded-xl bg-lime"
                  transition={SPRING}
                />
              )}
              <span className="relative">{label}</span>
              <span
                className={`relative rounded-full px-2 py-0.5 font-body text-[11px] font-bold ${
                  tab === key ? "bg-on-lime/15" : "bg-surface-highest"
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
