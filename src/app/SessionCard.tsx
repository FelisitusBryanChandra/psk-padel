"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { animate, motion, useMotionValue } from "motion/react";
import { DeleteSessionButton } from "./DeleteSessionButton";
import { RollingNumber } from "./RollingNumber";
import { Tilt } from "./Tilt";

export type SessionListItem = {
  id: string;
  name: string;
  date: string;
  sessionType: "AMERICANO" | "MEXICANO";
  courts: number;
  communityCode: string | null;
  playerCount: number;
  playerNames: string[];
  roundCount: number;
  status: "LIVE" | "COMPLETED" | null;
  currentRoundNumber: number | null;
  matchesDone: number;
  matchesTotal: number;
  roundProgress: number[];
  liveCourts: { courtNumber: number; label: string; team1: number; team2: number }[];
  top: { name: string; score: number; wins: number; losses: number; winStreak: number }[];
};

const REVEAL = 96;

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase();
}

// Wraps a card so it can be swiped left to reveal Delete. A drag never
// counts as a tap, so swiping doesn't also open the session.
export function SessionCard({
  session,
  showCommunity,
  onDeleted,
}: {
  session: SessionListItem;
  showCommunity: boolean;
  onDeleted: () => void;
}) {
  const x = useMotionValue(0);
  const dragged = useRef(false);
  const [open, setOpen] = useState(false);

  function settle(toOpen: boolean) {
    setOpen(toOpen);
    animate(x, toOpen ? -REVEAL : 0, { type: "spring", stiffness: 500, damping: 38 });
  }

  const card =
    session.status === "LIVE" ? (
      <LiveTicket s={session} showCommunity={showCommunity} />
    ) : session.status === "COMPLETED" ? (
      <ResultPoster s={session} showCommunity={showCommunity} />
    ) : (
      <InviteCard s={session} showCommunity={showCommunity} />
    );

  return (
    <div className="relative overflow-hidden rounded-[24px]">
      <div className="absolute inset-y-0 right-0 flex w-full items-stretch justify-end rounded-[24px] bg-live">
        <DeleteSessionButton
          sessionId={session.id}
          name={session.name}
          onDeleted={onDeleted}
          className="flex w-24 flex-col items-center justify-center gap-1 text-sm font-semibold text-white"
        >
          <span className="material-symbols-outlined">delete</span>
          Delete
        </DeleteSessionButton>
      </div>
      <motion.div
        style={{ x, touchAction: "pan-y" }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -REVEAL, right: 0 }}
        dragElastic={0.12}
        dragMomentum={false}
        onDragStart={() => (dragged.current = true)}
        onDragEnd={(_, info) => {
          settle(info.offset.x < -REVEAL / 2 || (open && info.offset.x < 20));
          setTimeout(() => (dragged.current = false), 0);
        }}
        onClickCapture={(e) => {
          if (dragged.current || open) {
            e.preventDefault();
            e.stopPropagation();
            if (open) settle(false);
          }
        }}
        className="relative"
      >
        <Link href={`/session/${session.id}`} className="block" draggable={false}>
          <Tilt className="rounded-[24px]">{card}</Tilt>
        </Link>
      </motion.div>
    </div>
  );
}

function Tags({ s, showCommunity, onAccent }: { s: SessionListItem; showCommunity: boolean; onAccent?: boolean }) {
  const cls = onAccent ? "bg-on-lime/10 text-on-lime" : "bg-surface-highest text-ink-muted";
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
        {s.sessionType}
      </span>
      {showCommunity && s.communityCode && (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
          #{s.communityCode}
        </span>
      )}
    </div>
  );
}

function LiveTicket({ s, showCommunity }: { s: SessionListItem; showCommunity: boolean }) {
  const d = new Date(s.date);
  // Only courts that have actually started; a forgotten match sitting at
  // 0-0 says nothing, so it's left out.
  const activeCourts = s.liveCourts.filter((c) => c.team1 + c.team2 > 0);
  const shownNames = s.playerNames.slice(0, 4);
  const extra = s.playerNames.length - shownNames.length;

  return (
    <div className="relative flex overflow-hidden rounded-[24px] bg-lime text-on-lime">
      <span aria-hidden="true" className="card-sweep" />
      <div className="relative flex w-16 shrink-0 flex-col items-center justify-center border-r-2 border-dashed border-on-lime/30">
        <span aria-hidden="true" className="absolute -right-[9px] -top-2 h-4 w-4 rounded-full bg-bg" />
        <span aria-hidden="true" className="absolute -bottom-2 -right-[9px] h-4 w-4 rounded-full bg-bg" />
        <span className="font-heading text-4xl font-black leading-none">{d.getDate()}</span>
        <span className="font-heading text-sm font-extrabold uppercase opacity-70">
          {d.toLocaleDateString(undefined, { month: "short" })}
        </span>
      </div>

      <div className="min-w-0 flex-1 p-4">
        <span className="flex items-center gap-2 whitespace-nowrap text-[11px] font-bold uppercase tracking-wider">
          <span className="live-dot text-live" />
          Live &middot; Round {s.currentRoundNumber}/{s.roundCount}
        </span>
        <h3 className="mt-1.5 truncate font-heading text-3xl font-black uppercase italic leading-none tracking-tight">
          {s.name}
        </h3>
        <div className="mt-2">
          <Tags s={s} showCommunity={showCommunity} onAccent />
        </div>

        <div className="mt-3 flex gap-1">
          {s.roundProgress.map((p, i) => (
            <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-on-lime/15">
              <motion.span
                className="block h-full rounded-full bg-on-lime"
                initial={{ width: 0 }}
                animate={{ width: `${p * 100}%` }}
                transition={{ duration: 0.9, delay: 0.15 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
          ))}
        </div>

        {s.top.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {s.top.map((t, i) => (
              <div key={t.name} className="min-w-0 rounded-xl bg-on-lime/10 px-2.5 py-1.5">
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase opacity-60">
                  <span>#{i + 1}</span>
                  {t.winStreak >= 3 && <span>🔥{t.winStreak}</span>}
                </div>
                <div className="truncate text-sm font-bold leading-tight">{t.name}</div>
                <RollingNumber value={t.score} className="font-heading text-2xl font-black" />
              </div>
            ))}
          </div>
        )}

        {activeCourts.length > 0 && (
          <div
            className={`mt-1.5 grid gap-1.5 ${activeCourts.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
          >
            {activeCourts.slice(0, 4).map((c) => (
              <div key={c.courtNumber} className="rounded-xl border-2 border-on-lime/15 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 truncate text-[10px] font-semibold uppercase opacity-60">
                  <span className="live-dot text-live" />
                  {c.label}
                </div>
                <div className="font-heading text-3xl font-black leading-none">
                  <RollingNumber value={c.team1} />
                  <span className="opacity-40">–</span>
                  <RollingNumber value={c.team2} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex pl-1.5">
            {shownNames.map((n) => (
              <span
                key={n}
                className="-ml-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-lime bg-on-lime text-[10px] font-bold text-lime"
              >
                {initials(n)}
              </span>
            ))}
            {extra > 0 && (
              <span className="-ml-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-lime bg-on-lime text-[10px] font-bold text-lime">
                +{extra}
              </span>
            )}
          </div>
          <span className="truncate text-xs font-semibold">
            {s.matchesDone}/{s.matchesTotal} matches played
          </span>
        </div>
      </div>
    </div>
  );
}

function ResultPoster({ s, showCommunity }: { s: SessionListItem; showCommunity: boolean }) {
  const [first, second, third] = s.top;
  const date = new Date(s.date).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const podium = [
    { row: second, h: "62%", place: 2 },
    { row: first, h: "100%", place: 1 },
    { row: third, h: "42%", place: 3 },
  ];

  return (
    <div className="rounded-[24px] border border-outline bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{date}</span>
        <Tags s={s} showCommunity={showCommunity} />
      </div>
      <div className="mt-2 flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-lg font-extrabold uppercase text-ink-muted">{s.name}</p>
          {first ? (
            <>
              <p className="mt-0.5 line-clamp-2 font-heading text-4xl font-black uppercase italic leading-[0.9] text-lime">
                {first.name}
                <br />
                wins
              </p>
              <p className="mt-2 text-xs text-ink-muted">
                {first.score} pts &middot; {first.wins}W {first.losses}L &middot; {s.playerCount} players
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">
              Final &middot; {s.playerCount} players &middot; {s.roundCount} rounds
            </p>
          )}
        </div>
        {first && (
          <div className="flex h-16 w-28 shrink-0 items-end gap-1">
            {podium.map(({ row, h, place }) =>
              row ? (
                <motion.div
                  key={place}
                  className={`flex flex-1 items-start justify-center rounded-t-lg pt-1 font-heading text-sm font-extrabold ${
                    place === 1 ? "bg-lime text-on-lime" : "bg-surface-highest text-ink"
                  }`}
                  initial={{ height: 0 }}
                  animate={{ height: h }}
                  transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.1 * place }}
                >
                  {initials(row.name)}
                </motion.div>
              ) : (
                <div key={place} className="flex-1" />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InviteCard({ s, showCommunity }: { s: SessionListItem; showCommunity: boolean }) {
  const [copied, setCopied] = useState(false);
  const seats = Math.max(s.courts * 4, s.playerCount);
  const date = new Date(s.date).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  async function copyInvite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(`${window.location.origin}/session/${s.id}/register`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-[24px] border-2 border-dashed border-outline bg-bg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-lime">
            Registration open
          </span>
          <h3 className="truncate font-heading text-3xl font-black uppercase leading-none text-ink">
            {s.name}
          </h3>
          <p className="mt-1 mb-2 text-xs text-ink-muted">
            {date} &middot; {s.courts} court{s.courts > 1 ? "s" : ""}
          </p>
          <Tags s={s} showCommunity={showCommunity} />
        </div>
        <button
          onClick={copyInvite}
          data-magnetic
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-lime px-3 py-2 text-xs font-semibold text-on-lime"
        >
          <span className="material-symbols-outlined text-base">{copied ? "check" : "share"}</span>
          {copied ? "Copied" : "Invite"}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Array.from({ length: seats }, (_, i) => {
          const name = s.playerNames[i];
          return (
            <motion.span
              key={i}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 20, delay: 0.04 * i }}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold ${
                name ? "bg-lime text-on-lime" : "border-2 border-dashed border-outline text-ink-muted"
              }`}
            >
              {name ? initials(name) : ""}
            </motion.span>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        {s.playerCount} of {seats} joined &middot; {Math.max(seats - s.playerCount, 0)} seat
        {seats - s.playerCount === 1 ? "" : "s"} left
      </p>
    </div>
  );
}
