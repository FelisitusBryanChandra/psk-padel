"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Logo } from "./Logo";
import { RollingNumber } from "./RollingNumber";

// Mounted once in the root layout so it stays planted while pages change
// underneath it. Phones and tablets get the notched dock with the padel
// ball; desktop gets the same pieces as a vertical rail on the left.

const TABS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/settings", label: "Settings", icon: "settings" },
  { href: "/profile", label: "Profile", icon: "person" },
] as const;
const NAV_ROUTES = new Set<string>(TABS.map((t) => t.href));
const NEW_HREF = "/session/start";

const BAR_H = 60;
const NOTCH_W = 96;
const BALL = 52;
const RADIUS = 24;
const SPRING = { type: "spring", stiffness: 500, damping: 34 } as const;

type LiveCourt = {
  sessionId: string;
  sessionName: string;
  matchId: string;
  court: string;
  team1: number;
  team2: number;
};

function useLiveCourts(enabled: boolean) {
  const [courts, setCourts] = useState<LiveCourt[]>([]);
  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled]);
  return courts;
}

// Index into a list that advances every few seconds when there's >1 item.
function useCycle(length: number, ms = 4000) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (length < 2) return;
    const t = setInterval(() => setIdx((i) => i + 1), ms);
    return () => clearInterval(t);
  }, [length, ms]);
  return length ? idx % length : 0;
}

// The New button: a padel ball. The target page is prefetched; every tap
// gets an instant lime ring burst, and the ball keeps spinning while the
// next page is still loading.
function Ball({ size, label }: { size: number; label?: boolean }) {
  const router = useRouter();
  const [turns, setTurns] = useState(0);
  const [bursts, setBursts] = useState<number[]>([]);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    router.prefetch(NEW_HREF);
  }, [router]);
  return (
    <div className="group relative" style={{ width: size, height: size }}>
      {label && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-full top-1/2 ml-5 -translate-y-1/2 -translate-x-2 whitespace-nowrap rounded-xl border border-outline bg-surface-highest px-3 py-1.5 text-xs font-semibold text-ink opacity-0 shadow-lg transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
        >
          New session
        </span>
      )}
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
          startTransition(() => router.push(NEW_HREF));
        }}
        className="relative flex h-full w-full items-center justify-center rounded-full bg-lime text-on-lime shadow-[0_8px_20px_-4px_rgba(0,0,0,0.6)] ring-[5px] ring-bg"
        animate={{ rotate: turns * 360 }}
        whileTap={{ scale: 0.86 }}
        whileHover={{ scale: 1.07, y: -3 }}
        transition={{ type: "spring", stiffness: 160, damping: 14 }}
      >
        {/* Seams roll a half turn on hover (they look identical at 180deg),
            and spin continuously while the next page is loading. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 52 52"
          className={`absolute inset-0 h-full w-full transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-180 ${
            pending ? "animate-spin" : ""
          }`}
          fill="none"
        >
          <path d="M8 13 C 19 21, 19 31, 8 39" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" />
          <path d="M44 13 C 33 21, 33 31, 44 39" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <svg aria-hidden="true" viewBox="0 0 52 52" className="absolute inset-0 h-full w-full" fill="none">
          <path d="M26 17 V35 M17 26 H35" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      </motion.button>
    </div>
  );
}

function Score({ c }: { c: LiveCourt }) {
  return (
    <span className="font-heading text-2xl font-black leading-none">
      <RollingNumber value={c.team1} />
      <span className="opacity-40">–</span>
      <RollingNumber value={c.team2} />
    </span>
  );
}

/* ---------------------------- phone + tablet ---------------------------- */

function DockTab({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
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
      {active && (
        <motion.span
          layoutId="dock-active"
          className="absolute bottom-[3px] h-[3px] w-4 rounded-full bg-lime"
          transition={SPRING}
        />
      )}
    </Link>
  );
}

function Dock({ pathname, courts }: { pathname: string; courts: LiveCourt[] }) {
  const idx = useCycle(courts.length);
  const c = courts[idx];
  const notchPath = `M0 0 H10 C22 0 21 ${BALL / 2 + 4} ${NOTCH_W / 2} ${BALL / 2 + 4} C${NOTCH_W - 21} ${
    BALL / 2 + 4
  } ${NOTCH_W - 22} 0 ${NOTCH_W - 10} 0 H${NOTCH_W}`;

  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 lg:hidden"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      initial={{ y: 140 }}
      animate={{ y: 0 }}
      exit={{ y: 140 }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
    >
      <div className="relative mx-auto max-w-md origin-bottom md:scale-[1.12]">
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
                    <Score c={c} />
                  </motion.span>
                </AnimatePresence>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-on-lime/15">
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </span>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        <nav aria-label="Main" className="pointer-events-auto relative" style={{ height: BAR_H }}>
          <div
            aria-hidden="true"
            className="absolute inset-0 flex text-surface-high"
            style={{ filter: "drop-shadow(0 10px 24px rgba(0,0,0,0.45))" }}
          >
            <div
              className="flex-1 border-y border-l border-outline bg-surface-high"
              style={{ borderTopLeftRadius: RADIUS, borderBottomLeftRadius: RADIUS }}
            />
            <svg
              width={NOTCH_W + 2}
              height={BAR_H}
              viewBox={`-1 0 ${NOTCH_W + 2} ${BAR_H}`}
              className="relative -mx-px block shrink-0"
            >
              <path d={`M-1 0 H0 ${notchPath.slice(4)} H${NOTCH_W + 1} V${BAR_H} H-1 Z`} fill="currentColor" />
              <path d={notchPath.replace(/ 0 /g, " 0.5 ")} stroke="var(--color-outline)" fill="none" />
              <path d={`M-1 ${BAR_H - 0.5} H${NOTCH_W + 1}`} stroke="var(--color-outline)" />
            </svg>
            <div
              className="flex-1 border-y border-r border-outline bg-surface-high"
              style={{ borderTopRightRadius: RADIUS, borderBottomRightRadius: RADIUS }}
            />
          </div>
          <div className="relative flex h-full px-2">
            {TABS.slice(0, 2).map((t) => (
              <DockTab key={t.href} {...t} active={pathname === t.href} />
            ))}
            <div className="shrink-0" style={{ width: NOTCH_W }} />
            {TABS.slice(2).map((t) => (
              <DockTab key={t.href} {...t} active={pathname === t.href} />
            ))}
          </div>
          <div className="absolute left-1/2 z-10" style={{ top: -BALL / 2, marginLeft: -BALL / 2 }}>
            <Ball size={BALL} />
          </div>
        </nav>
      </div>
    </motion.div>
  );
}

/* -------------------------------- desktop ------------------------------- */

function RailTab({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`group relative flex w-full flex-col items-center gap-1 rounded-2xl py-2.5 transition-colors duration-300 ${
        active ? "text-lime" : "text-ink-muted hover:text-ink"
      }`}
    >
      {active && (
        <motion.span
          layoutId="rail-active"
          className="absolute inset-0 rounded-2xl bg-surface-highest"
          transition={SPRING}
        />
      )}
      {active && (
        <motion.span
          layoutId="rail-bar"
          className="absolute -left-3 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-full bg-lime"
          transition={SPRING}
        />
      )}
      <span
        className="material-symbols-outlined relative text-[26px] transition-transform duration-300 group-hover:scale-110"
        style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        {icon}
      </span>
      <span className="relative text-[10px] font-semibold uppercase tracking-wider">{label}</span>
    </Link>
  );
}

function Rail({ pathname, courts }: { pathname: string; courts: LiveCourt[] }) {
  const idx = useCycle(courts.length);
  const c = courts[idx];
  return (
    <motion.nav
      aria-label="Main"
      className="fixed left-6 top-1/2 z-30 hidden w-[92px] flex-col items-center gap-2 rounded-[30px] border border-outline bg-surface-high px-3 py-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] lg:flex"
      style={{ y: "-50%" }}
      initial={{ x: -140, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -140, opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
    >
      <Link href="/" aria-label="PSK Padel home" className="mb-1">
        <Logo className="h-7 w-auto text-lime" />
      </Link>
      <div className="my-3">
        <Ball size={58} label />
      </div>
      <span className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">New</span>
      <div className="my-1 h-px w-10 bg-outline" />
      <div className="flex w-full flex-col gap-1">
        {TABS.map((t) => (
          <RailTab key={t.href} {...t} active={pathname === t.href} />
        ))}
      </div>
      <AnimatePresence>
        {c && (
          <motion.div
            key="rail-live"
            className="mt-2 w-full"
            initial={{ opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 10 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
          >
            <Link
              href={`/session/${c.sessionId}/match/${c.matchId}`}
              className="pressable flex flex-col items-center gap-1 rounded-2xl bg-lime px-1 py-3 text-on-lime"
            >
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase">
                <span className="live-dot text-live" />
                Live
              </span>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={c.matchId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col items-center"
                >
                  <span className="max-w-[64px] truncate text-[10px] font-semibold uppercase opacity-70">
                    {c.court}
                  </span>
                  <Score c={c} />
                </motion.span>
              </AnimatePresence>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

export function AppNav() {
  const pathname = usePathname();
  const show = NAV_ROUTES.has(pathname);
  const courts = useLiveCourts(show);

  return (
    <>
      {/* Keeps the last content clear of the floating island on phones. */}
      {show && courts.length > 0 && <div aria-hidden="true" className="h-14 shrink-0 lg:hidden" />}
      <AnimatePresence>{show && <Dock key="app-dock" pathname={pathname} courts={courts} />}</AnimatePresence>
      <AnimatePresence>{show && <Rail key="app-rail" pathname={pathname} courts={courts} />}</AnimatePresence>
    </>
  );
}
