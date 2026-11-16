"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { RollingNumber } from "./RollingNumber";

const LEFT = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/history", label: "History", icon: "history" },
] as const;
const RIGHT = [
  { href: "/settings", label: "Settings", icon: "settings" },
  { href: "/profile", label: "Profile", icon: "person" },
] as const;

const NOTCH_W = 124;
const BAR_H = 66;

type LiveCourt = {
  sessionId: string;
  sessionName: string;
  matchId: string;
  court: string;
  team1: number;
  team2: number;
};

function Tab({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`pressable relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors duration-300 ${
        active ? "text-lime" : "text-ink-muted"
      }`}
    >
      <motion.span
        className="material-symbols-outlined text-[26px]"
        style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
        initial={false}
        animate={{ y: active ? -2 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 24 }}
      >
        {icon}
      </motion.span>
      {label}
      {active && (
        <motion.span
          className="absolute bottom-1.5 h-[3px] w-5 rounded-full bg-lime"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 22, delay: 0.05 }}
        />
      )}
    </Link>
  );
}

// The New button: a padel ball resting in the bar's notch. Spins a full
// turn on tap, then navigates once the spin has visibly started.
function Ball() {
  const router = useRouter();
  const [turns, setTurns] = useState(0);
  return (
    <motion.button
      type="button"
      aria-label="New session"
      onClick={() => {
        setTurns((t) => t + 1);
        navigator.vibrate?.(10);
        setTimeout(() => router.push("/session/start"), 220);
      }}
      className="absolute left-1/2 z-10 -ml-[31px] flex h-[62px] w-[62px] items-center justify-center rounded-full bg-lime text-on-lime shadow-[0_12px_30px_-8px_var(--color-lime)]"
      style={{ top: -30 }}
      animate={{ rotate: turns * 360 }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: "spring", stiffness: 120, damping: 14 }}
    >
      <svg aria-hidden="true" viewBox="0 0 62 62" className="absolute inset-0 h-full w-full" fill="none">
        <path d="M9 14 C 24 24, 24 38, 9 48" stroke="currentColor" strokeOpacity="0.28" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M53 14 C 38 24, 38 38, 53 48" stroke="currentColor" strokeOpacity="0.28" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span className="material-symbols-outlined relative text-[30px] font-bold">add</span>
    </motion.button>
  );
}

// Lime pill floating above the ball while a court is actually scoring.
// Cycles through courts when several are live; tap jumps to that scoreboard.
function LiveIsland({ courts }: { courts: LiveCourt[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (courts.length < 2) return;
    const t = setInterval(() => setIdx((i) => i + 1), 4000);
    return () => clearInterval(t);
  }, [courts.length]);

  const c = courts.length ? courts[idx % courts.length] : null;

  return (
    <AnimatePresence>
      {c && (
        <motion.div
          key="island"
          className="pointer-events-auto absolute left-1/2 z-20"
          style={{ bottom: BAR_H + 44, x: "-50%" }}
          initial={{ opacity: 0, y: 24, scale: 0.6 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.6 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
        >
          <Link
            href={`/session/${c.sessionId}/match/${c.matchId}`}
            className="pressable flex items-center gap-2.5 whitespace-nowrap rounded-full bg-lime py-1.5 pl-3.5 pr-2 text-on-lime shadow-[0_10px_30px_-10px_var(--color-lime)] ring-4 ring-bg"
          >
            <span className="live-dot text-live" />
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={c.matchId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-2.5"
              >
                <span className="text-xs font-bold uppercase tracking-wide">{c.court}</span>
                <span className="font-heading text-2xl font-black leading-none">
                  <RollingNumber value={c.team1} />
                  <span className="opacity-40">–</span>
                  <RollingNumber value={c.team2} />
                </span>
              </motion.span>
            </AnimatePresence>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-on-lime/15">
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Mobile nav: an edge-to-edge dock with a notch cut into its top edge,
// a padel-ball New button resting in it, and a live-score island above
// whenever a court is in play. SideNav covers desktop.
export function BottomNav() {
  const pathname = usePathname();
  const [courts, setCourts] = useState<LiveCourt[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/live");
        if (res.ok && alive) setCourts(await res.json());
      } catch {
        // offline: keep whatever was last shown
      }
    }
    load();
    const t = setInterval(load, 10000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <>
      {/* Keeps the last content clear of the island when it's showing. */}
      {courts.length > 0 && <div aria-hidden="true" className="h-14 shrink-0 md:hidden" />}
      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 md:hidden">
        <div className="relative mx-auto max-w-md">
          <LiveIsland courts={courts} />
          <div className="pointer-events-auto relative">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 flex text-surface-high"
              style={{ height: BAR_H, filter: "drop-shadow(0 -10px 24px rgba(0,0,0,0.35))" }}
            >
              <div className="flex-1 border-t border-outline bg-surface-high" />
              <svg width={NOTCH_W} height={BAR_H} viewBox={`0 0 ${NOTCH_W} ${BAR_H}`} className="block shrink-0">
                <path
                  d={`M0 0 H20 C36 0 34 38 62 38 C90 38 88 0 104 0 H${NOTCH_W} V${BAR_H} H0 Z`}
                  fill="currentColor"
                />
                <path
                  d={`M0 0.5 H20 C36 0.5 34 38.5 62 38.5 C90 38.5 88 0.5 104 0.5 H${NOTCH_W}`}
                  stroke="var(--color-outline)"
                  fill="none"
                />
              </svg>
              <div className="flex-1 border-t border-outline bg-surface-high" />
            </div>
            <div className="relative flex" style={{ height: BAR_H }}>
              {LEFT.map((t) => (
                <Tab key={t.href} {...t} active={pathname === t.href} />
              ))}
              <div className="shrink-0" style={{ width: NOTCH_W - 20 }} />
              {RIGHT.map((t) => (
                <Tab key={t.href} {...t} active={pathname === t.href} />
              ))}
            </div>
            <Ball />
            <div className="bg-surface-high" style={{ height: "env(safe-area-inset-bottom)" }} />
          </div>
        </div>
      </nav>
    </>
  );
}
