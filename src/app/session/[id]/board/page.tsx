"use client";

import { use, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Avatar } from "@/app/Avatar";
import { ExportStandingsButton } from "@/app/ExportStandingsButton";
import { Logo } from "@/app/Logo";
import { RollingNumber } from "@/app/RollingNumber";
import { useSessionData } from "@/app/useSessionData";
import { initialsFor } from "@/lib/initials";
import { computeRanks, courtLabel, sortStandings, type MatchDto, type SessionDto } from "@/lib/types";

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;
const MEDAL = ["#f7cf4f", "#d5dce3", "#dd8f45"];

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 15000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  return now;
}

function serverId(m: MatchDto) {
  if (m.servingTeam === 1) return m.team1ServerSlot === 1 ? m.team1Player1.id : m.team1Player2.id;
  return m.team2ServerSlot === 1 ? m.team2Player1.id : m.team2Player2.id;
}

// One court as a broadcast scoreboard: two team rows with avatars and huge
// rolling scores; the leading team's score lights up.
function CourtBoard({
  session,
  m,
  i,
  solo,
  labels,
}: {
  session: SessionDto;
  m: MatchDto;
  i: number;
  solo: boolean;
  labels: Map<string, string>;
}) {
  const setMode = session.scoringMode === "SET";
  const s1 = setMode ? m.team1Games : m.team1Score;
  const s2 = setMode ? m.team2Games : m.team2Score;
  const serving = serverId(m);
  const teams = [
    { players: [m.team1Player1, m.team1Player2], score: s1, ahead: s1 > s2 },
    { players: [m.team2Player1, m.team2Player2], score: s2, ahead: s2 > s1 },
  ];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ ...SPRING, delay: i * 0.08 }}
      className="live-ring relative flex flex-col rounded-[28px] border border-outline bg-surface p-[clamp(16px,1.6vw,28px)]"
    >
      <div className="flex items-center justify-between">
        <span className="font-heading text-[clamp(1.4rem,2vw,2.4rem)] font-black uppercase italic text-ink">
          {courtLabel(session, m.courtNumber)}
        </span>
        <span className="flex items-center gap-2 rounded-full bg-live-bg px-4 py-1.5 font-heading text-[clamp(0.9rem,1.1vw,1.3rem)] font-bold uppercase tracking-wider text-live">
          <span className="live-dot" />
          Live
        </span>
      </div>
      <div className="mt-3 flex flex-1 flex-col justify-center divide-y divide-outline">
        {teams.map((t, idx) => (
          <div key={idx} className="flex items-center gap-4 py-[clamp(8px,1vw,16px)]">
            <div className="flex -space-x-3">
              {t.players.map((p) => (
                <span key={p.id} className="rounded-full ring-4 ring-surface">
                  <Avatar name={p.name} size={solo ? 96 : 52} className="block" badge={labels.get(p.name)} />
                </span>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              {t.players.map((p) => (
                <p
                  key={p.id}
                  className={`flex items-center gap-2 truncate font-semibold leading-tight ${
                    solo ? "text-[clamp(1.4rem,2.4vw,3rem)]" : "text-[clamp(1rem,1.4vw,1.7rem)]"
                  } ${
                    t.ahead ? "text-ink" : "text-ink-muted"
                  }`}
                >
                  {p.name}
                  {serving === p.id && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-lime" />}
                </p>
              ))}
            </div>
            <RollingNumber
              value={t.score}
              className={`font-heading font-black transition-colors duration-500 ${
                solo ? "text-[clamp(5rem,11vw,13rem)]" : "text-[clamp(3.5rem,6vw,7.5rem)]"
              } ${
                t.ahead ? "text-lime" : "text-ink"
              }`}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { session, standings } = useSessionData(id, () => 5000);
  const now = useClock();

  if (!session) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Logo className="h-16 w-auto animate-pulse text-lime" />
      </main>
    );
  }

  const currentRound = session.rounds.find((r) => r.matches.some((m) => !m.completed));
  const liveMatches = currentRound?.matches.filter((m) => !m.completed) ?? [];
  const nextRound = currentRound
    ? session.rounds.find((r) => r.roundNumber === currentRound.roundNumber + 1)
    : undefined;
  const sorted = sortStandings(standings);
  const ranks = computeRanks(sorted);
  const maxScore = Math.max(1, ...sorted.map((r) => r.score));
  const leader = sorted[0];
  const labels = initialsFor([...session.players.map((sp) => sp.player.name), ...sorted.map((r) => r.name)]);
  const scoreLabel = session.scoringMode === "SET" ? "Games" : "Score";
  const finished = session.rounds.length > 0 && !currentRound;

  const ticker = nextRound
    ? nextRound.matches.map(
        (m) =>
          `${courtLabel(session, m.courtNumber)}  ·  ${m.team1Player1.name} & ${m.team1Player2.name}  vs  ${m.team2Player1.name} & ${m.team2Player2.name}`
      )
    : [];

  return (
    <main className="relative flex min-h-dvh w-full flex-col overflow-hidden px-[clamp(16px,2.5vw,48px)] py-[clamp(16px,2vw,36px)]">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <Logo className="h-[clamp(28px,2.6vw,44px)] w-auto text-lime" />
          <span className="font-heading text-[clamp(1.2rem,1.6vw,2rem)] font-black italic text-ink">
            PSK<span className="text-lime">/</span>PADEL
          </span>
        </div>
        <h1 className="min-w-0 flex-1 truncate font-heading text-[clamp(2rem,4vw,4.5rem)] font-black uppercase italic leading-none tracking-tight text-ink">
          {session.name}
        </h1>
        <div className="flex items-center gap-3">
          {session.rounds.length > 0 && (
            <span className="rounded-2xl border border-outline bg-surface px-4 py-2 font-heading text-[clamp(1rem,1.4vw,1.6rem)] font-extrabold uppercase text-ink">
              {finished ? "Final" : `Round ${currentRound?.roundNumber} / ${session.rounds.length}`}
            </span>
          )}
          {now && (
            <span className="rounded-2xl bg-lime px-4 py-2 font-heading text-[clamp(1rem,1.4vw,1.6rem)] font-black tabular-nums text-on-lime">
              {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <div className="opacity-60 transition-opacity hover:opacity-100">
            <ExportStandingsButton
              rows={standings}
              scoreLabel={scoreLabel}
              sessionName={session.name}
              sessionDate={session.date}
            />
          </div>
        </div>
      </header>

      {/* Round progress */}
      {session.rounds.length > 0 && (
        <div className="mt-4 flex gap-1.5">
          {session.rounds.map((r) => {
            const done = r.matches.filter((m) => m.completed).length;
            return (
              <span key={r.id} className="h-2 flex-1 overflow-hidden rounded-full bg-surface-highest">
                <motion.span
                  className="block h-full rounded-full bg-lime"
                  initial={false}
                  animate={{ width: `${(done / Math.max(1, r.matches.length)) * 100}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
            );
          })}
        </div>
      )}

      <div className="mt-[clamp(16px,2vw,32px)] grid flex-1 gap-[clamp(16px,2vw,32px)] lg:grid-cols-[1.35fr_1fr]">
        {/* Courts */}
        <section className="flex min-h-0 flex-col">
          <h2 className="mb-3 flex items-center gap-2 font-heading text-[clamp(1rem,1.3vw,1.5rem)] font-bold uppercase tracking-widest text-ink-muted">
            {liveMatches.length ? (
              <>
                <span className="live-dot text-live" /> On court
              </>
            ) : finished ? (
              "Session complete"
            ) : (
              "Waiting to start"
            )}
          </h2>
          {liveMatches.length > 0 ? (
            <div
              className={`grid flex-1 gap-[clamp(12px,1.4vw,24px)] ${
                liveMatches.length > 1 ? "xl:grid-cols-2 lg:grid-cols-1 md:grid-cols-2" : ""
              }`}
            >
              <AnimatePresence>
                {liveMatches.map((m, i) => (
                  <CourtBoard
                    key={m.id}
                    session={session}
                    m={m}
                    i={i}
                    solo={liveMatches.length === 1}
                    labels={labels}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : leader ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={SPRING}
              className="live-flow relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-[32px] bg-lime p-8 text-center text-on-lime"
            >
              <span aria-hidden="true" className="live-flow-swirl" />
              <span
                className="material-symbols-outlined text-[clamp(3rem,6vw,6rem)]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                trophy
              </span>
              <Avatar name={leader.name} size={140} ring="#0b0d0c" className="mt-4" badge={labels.get(leader.name)} />
              <p className="mt-5 font-heading text-[clamp(2.5rem,6vw,7rem)] font-black uppercase italic leading-[0.85]">
                {leader.name}
              </p>
              <p className="mt-3 font-heading text-[clamp(1.2rem,2vw,2.4rem)] font-extrabold uppercase">
                {finished ? "Champion" : "Leading"} · {leader.score} {scoreLabel.toLowerCase()}
              </p>
            </motion.div>
          ) : null}
        </section>

        {/* Leaderboard */}
        <section className="flex min-h-0 flex-col">
          <h2 className="mb-3 flex items-center justify-between font-heading text-[clamp(1rem,1.3vw,1.5rem)] font-bold uppercase tracking-widest text-ink-muted">
            <span>Leaderboard</span>
            <span>{scoreLabel}</span>
          </h2>
          <div className="flex flex-col gap-[clamp(6px,0.6vw,10px)]">
            {sorted.slice(0, 10).map((r, idx) => {
              const rank = ranks[idx];
              const top = rank <= 3;
              return (
                <motion.div
                  layout
                  key={r.playerId}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...SPRING, delay: idx * 0.05 }}
                  className={`relative flex items-center gap-4 overflow-hidden rounded-2xl px-4 py-[clamp(8px,0.8vw,14px)] ${
                    rank === 1 ? "bg-lime text-on-lime" : "bg-surface text-ink"
                  } ${r.winStreak >= 3 && rank !== 1 ? "streak-row" : ""}`}
                >
                  {rank === 1 && <span aria-hidden="true" className="card-sweep" />}
                  <span
                    className="relative flex h-[clamp(32px,2.6vw,48px)] w-[clamp(32px,2.6vw,48px)] shrink-0 items-center justify-center rounded-full font-heading text-[clamp(1.2rem,1.8vw,2rem)] font-black"
                    style={top ? { background: rank === 1 ? "#0b0d0c" : MEDAL[rank - 1], color: rank === 1 ? MEDAL[0] : "#0b0d0c" } : undefined}
                  >
                    {rank}
                  </span>
                  <Avatar name={r.name} size={44} badge={labels.get(r.name)} />
                  <div className="relative min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-[clamp(1rem,1.4vw,1.7rem)] font-semibold">
                      {r.name}
                      {r.winStreak >= 3 && (
                        <span className="shrink-0 text-[clamp(0.8rem,1vw,1.1rem)]">🔥{r.winStreak}</span>
                      )}
                    </p>
                    <span
                      className={`mt-1 block h-1.5 overflow-hidden rounded-full ${
                        rank === 1 ? "bg-on-lime/15" : "bg-surface-highest"
                      }`}
                    >
                      <motion.span
                        className={`block h-full rounded-full ${rank === 1 ? "bg-on-lime" : "bg-lime"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(Math.max(r.score, 0) / maxScore) * 100}%` }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 + idx * 0.05 }}
                      />
                    </span>
                  </div>
                  <span className="relative hidden text-right text-[clamp(0.8rem,1vw,1.1rem)] opacity-70 xl:block">
                    {r.wins}W {r.losses}L
                  </span>
                  <RollingNumber
                    value={r.score}
                    className="relative font-heading text-[clamp(1.8rem,3vw,3.4rem)] font-black"
                  />
                </motion.div>
              );
            })}
            {sorted.length > 10 && (
              <p className="px-2 text-sm text-ink-muted">+{sorted.length - 10} more players</p>
            )}
          </div>
        </section>
      </div>

      {/* Up next ticker */}
      {ticker.length > 0 && (
        <div className="mt-[clamp(16px,2vw,28px)] flex items-center overflow-hidden rounded-2xl border border-outline bg-surface">
          <span className="z-10 shrink-0 bg-lime px-5 py-3 font-heading text-[clamp(1rem,1.3vw,1.5rem)] font-black uppercase text-on-lime">
            Up next · R{nextRound?.roundNumber}
          </span>
          <div className="relative flex-1 overflow-hidden">
            <motion.div
              className="flex w-max gap-16 whitespace-nowrap px-6 font-heading text-[clamp(1rem,1.4vw,1.6rem)] font-bold uppercase text-ink"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 18 + ticker.length * 6, repeat: Infinity, ease: "linear" }}
            >
              {[...ticker, ...ticker].map((t, i) => (
                <span key={i}>{t}</span>
              ))}
            </motion.div>
          </div>
        </div>
      )}
    </main>
  );
}
