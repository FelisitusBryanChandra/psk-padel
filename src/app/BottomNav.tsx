"use client";

import { useEffect, useState, useTransition } from "react";
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

const BAR_H = 60;
const NOTCH_W = 96;
const BALL = 52;
const RADIUS = 24;

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
      aria-label={label}
      className={`pressable relative flex h-full flex-1 flex-col items-center justify-center transition-colors duration-300 ${
        active ? "text-lime" : "text-ink-muted"
      }`}
    >
      <motion.span
        className="material-symbols-outlined text-[25px] leading-none"
        style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
        initial={false}
        animate={{ y: active ? -5 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 26 }}
      >
        {icon}
      </motion.span>
      <AnimatePresence initial={false}>
        {active && (
          <motion.span
            className="absolute bottom-[9px] text-[10px] font-semibold uppercase tracking-wider"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

// The New button: a padel ball sunk into the dock's notch. The target page
// is prefetched so the tap navigates right away. Every tap gets an instant
// lime ring burst; while the next page is still loading, the ball keeps
// spinning as a loading indicator.
function Ball() {
  const router = useRouter();
  const [turns, setTurns] = useState(0);
  const [bursts, setBursts] = useState<number[]>([]);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    router.prefetch("/session/start");
  }, [router]);
  return (
    <div
      className="absolute left-1/2 z-10"
      style={{ width: BALL, height: BALL, marginLeft: -BALL / 2, top: -BALL / 2 }}
    >
      <AnimatePresence>
        {bursts.map((id) => (
          <motion.span
            key={id}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-lime"
            initial={{ scale: 1, opacity: 0.9 }}
            animate={{ scale: 2.3, opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => setBursts((b) => b.filter((x) => x !== id))}
          />
        ))}
      </AnimatePresence>
      <motion.button
        type="button"
        aria-label="New session"
        aria-busy={pending}
        onClick={() => {
          setTurns((t) => t + 1);
          setBursts((b) => [...b, Date.now()]);
          navigator.vibrate?.(10);
          startTransition(() => router.push("/session/start"));
        }}
        className="relative flex h-full w-full items-center justify-center rounded-full bg-lime text-on-lime shadow-[0_8px_20px_-4px_rgba(0,0,0,0.6)] ring-[5px] ring-bg"
        animate={{ rotate: turns * 360 }}
        whileTap={{ scale: 0.86 }}
        transition={{ type: "spring", stiffness: 160, damping: 14 }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 52 52"
          className={`absolute inset-0 h-full w-full ${pending ? "animate-spin" : ""}`}
          fill="none"
        >
          <path d="M8 13 C 19 21, 19 31, 8 39" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" />
          <path d="M44 13 C 33 21, 33 31, 44 39" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" />
          <path d="M26 17 V35 M17 26 H35" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      </motion.button>
    </div>
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
          style={{ bottom: BAR_H + BALL / 2 + 14, x: "-50%" }}
          initial={{ opacity: 0, y: 20, scale: 0.6 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.6 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
        >
          <Link
            href={`/session/${c.sessionId}/match/${c.matchId}`}
            className="pressable flex items-center gap-2.5 whitespace-nowrap rounded-full bg-lime py-1.5 pl-3.5 pr-2 text-on-lime ring-4 ring-bg"
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

// Mobile nav: a floating dock with a notch in its top edge, a padel-ball
// New button sunk into it, and a live-score island above whenever a court
// is in play. SideNav covers desktop.
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

  const notchPath = `M0 0 H10 C22 0 21 ${BALL / 2 + 4} ${NOTCH_W / 2} ${BALL / 2 + 4} C${NOTCH_W - 21} ${
    BALL / 2 + 4
  } ${NOTCH_W - 22} 0 ${NOTCH_W - 10} 0 H${NOTCH_W}`;

  return (
    <>
      {/* Keeps the last content clear of the island when it's showing. */}
      {courts.length > 0 && <div aria-hidden="true" className="h-14 shrink-0 md:hidden" />}
      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 md:hidden"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <div className="relative mx-auto max-w-md">
          <LiveIsland courts={courts} />
          <div className="pointer-events-auto relative" style={{ height: BAR_H }}>
            <div
              aria-hidden="true"
              className="absolute inset-0 flex text-surface-high"
              style={{ filter: "drop-shadow(0 10px 24px rgba(0,0,0,0.45))" }}
            >
              <div
                className="flex-1 border-y border-l border-outline bg-surface-high"
                style={{ borderTopLeftRadius: RADIUS, borderBottomLeftRadius: RADIUS }}
              />
              <svg width={NOTCH_W} height={BAR_H} viewBox={`0 0 ${NOTCH_W} ${BAR_H}`} className="block shrink-0">
                <path d={`${notchPath} V${BAR_H} H0 Z`} fill="currentColor" />
                <path d={notchPath.replace(/ 0 /g, " 0.5 ")} stroke="var(--color-outline)" fill="none" />
                <path d={`M0 ${BAR_H - 0.5} H${NOTCH_W}`} stroke="var(--color-outline)" />
              </svg>
              <div
                className="flex-1 border-y border-r border-outline bg-surface-high"
                style={{ borderTopRightRadius: RADIUS, borderBottomRightRadius: RADIUS }}
              />
            </div>
            <div className="relative flex h-full px-2">
              {LEFT.map((t) => (
                <Tab key={t.href} {...t} active={pathname === t.href} />
              ))}
              <div className="shrink-0" style={{ width: NOTCH_W }} />
              {RIGHT.map((t) => (
                <Tab key={t.href} {...t} active={pathname === t.href} />
              ))}
            </div>
            <Ball />
          </div>
        </div>
      </nav>
    </>
  );
}
