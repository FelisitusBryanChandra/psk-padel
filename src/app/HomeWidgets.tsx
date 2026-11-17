"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "motion/react";
import type { WidgetsPayload } from "@/app/api/widgets/route";
import { initialsFor } from "@/lib/initials";
import { Avatar } from "./Avatar";
import type { SessionListItem } from "./SessionCard";
import { Tilt } from "./Tilt";

const FLAP_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function daysUntil(date: string) {
  return Math.round((startOfDay(new Date(date)) - startOfDay(new Date())) / DAY_MS);
}

// Swipeable rail of Home widgets: next session, the month's win race, and the week's closest match.
export function HomeWidgets({ sessions }: { sessions: SessionListItem[] }) {
  const [data, setData] = useState<WidgetsPayload | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    fetch("/api/widgets")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const next = sessions
    .filter((s) => s.status === null && daysUntil(s.date) >= 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const cards = [
    next && <NextUpWidget key="next" s={next} />,
    data && data.king.length > 0 && <KingWidget key="king" king={data.king} />,
    data?.nailBiter && <NailBiterWidget key="nail" n={data.nailBiter} />,
  ].filter(Boolean);

  if (cards.length === 0) return null;

  function onScroll() {
    const el = railRef.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 12 : el.clientWidth;
    setActive(Math.round(el.scrollLeft / step));
  }

  return (
    <div className="relative mt-5">
      <div
        ref={railRef}
        onScroll={onScroll}
        className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.6 + i * 0.08 }}
            className={`w-[86%] max-w-[320px] shrink-0 snap-start md:w-auto md:max-w-none ${
              cards.length % 2 === 1 && i === cards.length - 1 ? "md:col-span-2" : ""
            }`}
          >
            <Tilt className="h-full rounded-[22px]" max={4} lift={false}>
              {c}
            </Tilt>
          </motion.div>
        ))}
      </div>
      {cards.length > 1 && (
        <div className="mt-2.5 flex justify-center gap-1.5 md:hidden">
          {cards.map((_, i) => (
            <motion.span
              key={i}
              className="h-1.5 rounded-full"
              animate={{
                width: i === active ? 18 : 6,
                backgroundColor: i === active ? "var(--color-lime)" : "var(--color-outline)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Shell({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="relative flex h-[196px] flex-col overflow-hidden rounded-[22px] border border-outline bg-surface p-4"
    >
      {children}
    </Link>
  );
}

function Kicker({ left, right, hot }: { left: string; right?: React.ReactNode; hot?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{left}</span>
      {right && (
        <span
          className={`shrink-0 font-heading text-sm font-black uppercase tracking-wide ${hot ? "text-live" : "text-lime"}`}
        >
          {right}
        </span>
      )}
    </div>
  );
}

// Split-flap board: each tile scrambles through characters before landing, left to right.
function FlapBoard({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(() => text.replace(/\S/g, " "));

  useEffect(() => {
    if (!inView) return;
    let tick = 0;
    const id = setInterval(
      () => {
        tick++;
        setShown(
          [...text]
            .map((ch, i) =>
              ch === " " || reduce || tick >= 6 + i * 2
                ? ch
                : FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)]
            )
            .join("")
        );
        if (reduce || tick >= 6 + text.length * 2) clearInterval(id);
      },
      reduce ? 0 : 55
    );
    return () => clearInterval(id);
  }, [inView, reduce, text]);

  return (
    <div ref={ref} className="flex gap-[3px]">
      {[...shown].map((ch, i) =>
        text[i] === " " ? (
          <span key={i} className="w-2" />
        ) : (
          <span
            key={`${i}-${ch}`}
            className="flap-tile relative flex h-11 w-[26px] items-center justify-center rounded-md bg-bg-2 font-heading text-[30px] font-black leading-none text-lime"
          >
            {ch}
          </span>
        )
      )}
    </div>
  );
}

function NextUpWidget({ s }: { s: SessionListItem }) {
  const days = daysUntil(s.date);
  const board = days === 0 ? "TODAY" : days === 1 ? "TOMORROW" : `${days} DAYS`;
  const seats = Math.max(s.courts * 4, s.playerCount);
  const left = Math.max(0, s.courts * 4 - s.playerCount);
  const slots = Math.min(seats, 8);
  const labels = initialsFor(s.playerNames);
  const date = new Date(s.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

  return (
    <Shell href={`/session/${s.id}`}>
      <Kicker left={`Next up · ${date}`} right={s.venueName ? `Gate ${s.venueName}` : "Boarding"} />
      <p className="mt-1.5 truncate font-heading text-2xl font-black uppercase italic leading-none text-ink">
        {s.name}
      </p>
      <div className="mt-2.5">
        {days >= 2 && (
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-ink-muted">Departs in</span>
        )}
        <FlapBoard text={board} />
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: slots }, (_, i) => {
            const name = s.playerNames[i];
            return name ? (
              <motion.span
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20, delay: 1 + i * 0.06 }}
              >
                <Avatar name={name} size={22} badge={labels.get(name)} />
              </motion.span>
            ) : (
              <span key={i} className="h-[22px] w-[22px] rounded-full border-[1.5px] border-dashed border-outline" />
            );
          })}
          {seats > slots && <span className="text-xs font-semibold text-ink-muted">+{seats - slots}</span>}
        </div>
        <span className="shrink-0 font-heading text-sm font-black uppercase text-lime">
          {left === 0 ? "Full" : `${left} seat${left === 1 ? "" : "s"}`}
        </span>
      </div>
    </Shell>
  );
}

function KingWidget({ king }: { king: { name: string; wins: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [leader, second] = king;
  const gap = leader.wins - (second?.wins ?? 0);
  const max = Math.max(1, leader.wins);
  const labels = initialsFor(king.map((k) => k.name));
  const month = new Date().toLocaleDateString(undefined, { month: "long" });

  return (
    <Shell href="/profile">
      <Kicker left={`King of ${month}`} right={gap > 0 ? `+${gap} ahead` : "Tied"} />
      <div className="mt-2 flex items-center gap-3">
        <div className="relative">
          <motion.span
            className="material-symbols-outlined absolute -top-4 left-1/2 -ml-[11px] text-[22px] text-[#f7cf4f]"
            style={{ fontVariationSettings: "'FILL' 1" }}
            initial={{ y: -14, opacity: 0, rotate: -20 }}
            animate={inView ? { y: 0, opacity: 1, rotate: -8 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 12, delay: 1.2 }}
          >
            crown
          </motion.span>
          <Avatar name={leader.name} size={40} ring="#f7cf4f" badge={labels.get(leader.name)} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-heading text-2xl font-black uppercase leading-none text-lime">{leader.name}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            <span className="font-heading text-lg font-black text-ink">{leader.wins}</span> wins this month
          </p>
        </div>
      </div>
      <div ref={ref} className="mt-auto flex flex-col">
        {king.map((k, i) => (
          <div key={k.name} className={`relative h-[26px] ${i < king.length - 1 ? "border-b border-dashed border-outline" : ""}`}>
            {i === 0 && (
              <span className="material-symbols-outlined absolute bottom-1 right-0 text-base text-ink-muted">
                sports_score
              </span>
            )}
            <motion.span
              className="absolute bottom-[3px] flex items-center gap-1.5"
              initial={{ left: "0%" }}
              animate={inView ? { left: `${(k.wins / max) * 78}%` } : {}}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 + i * 0.12 }}
            >
              <Avatar name={k.name} size={18} />
              <span className="font-heading text-xs font-black text-ink-muted">{k.wins}</span>
            </motion.span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

// The line is a decorative heartbeat; only final scores are stored, so it doesn't plot real points.
const ECG = "0,30 30,30 40,18 48,40 58,30 90,30 100,44 108,14 118,30 150,30 158,20 166,42 176,30 205,30 213,46 222,8 232,30 268,30";

function NailBiterWidget({ n }: { n: NonNullable<WidgetsPayload["nailBiter"]> }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const diff = Math.abs(n.score1 - n.score2);
  const win1 = n.score1 > n.score2;
  const labels = initialsFor([...n.team1, ...n.team2]);
  const date = new Date(n.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

  const pair = (names: [string, string], won: boolean) => (
    <div className={`flex flex-col gap-2 ${won ? "" : "opacity-60"}`}>
      {names.map((nm) => (
        <Avatar key={nm} name={nm} size={24} badge={labels.get(nm)} />
      ))}
    </div>
  );

  return (
    <Shell href={`/session/${n.sessionId}`}>
      <Kicker left="Nail-biter of the week" right={`Won by ${diff}`} hot />
      <div ref={ref} className="mt-2 flex items-center justify-between gap-2">
        {pair(n.team1, win1)}
        <p className="font-heading text-[44px] font-black leading-none tabular-nums">
          <span className={win1 ? "text-lime" : "text-ink"}>{n.score1}</span>
          <span className="text-3xl text-ink-muted">–</span>
          <span className={win1 ? "text-ink" : "text-lime"}>{n.score2}</span>
        </p>
        {pair(n.team2, !win1)}
      </div>
      <svg viewBox="0 0 268 56" className="mt-1 h-14 w-full" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1="30" x2="268" y2="30" stroke="var(--color-outline)" strokeDasharray="3 4" />
        <motion.polyline
          points={ECG}
          fill="none"
          stroke="var(--color-lime)"
          strokeWidth="2.2"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : {}}
          transition={{ duration: 2.2, ease: "easeOut", delay: 0.4 }}
        />
      </svg>
      <span className="mt-auto truncate text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        {n.court} · {date} · {n.sessionName}
      </span>
    </Shell>
  );
}
