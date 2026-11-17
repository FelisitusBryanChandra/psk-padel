"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { PageHero, Segmented } from "@/app/PageHero";
import { Spinner } from "@/app/Spinner";
import type { MatchHistoryEntry } from "@/lib/matchHistory";

const FILTERS = ["All", "Americano", "Mexicano"] as const;
type Filter = (typeof FILTERS)[number];

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-3xl bg-surface" />
      ))}
    </div>
  );
}

// "21-17" -> [21, 17]; anything unparsable falls back to showing the raw text.
function splitScore(score: string): [string, string] | null {
  const m = score.match(/^\s*(\d+)\s*[-–]\s*(\d+)\s*$/);
  return m ? [m[1], m[2]] : null;
}

function MatchRow({ h, i }: { h: MatchHistoryEntry; i: number }) {
  const parts = splitScore(h.score);
  const s1 = parts ? Number(parts[0]) : 0;
  const s2 = parts ? Number(parts[1]) : 0;
  const teams = [
    { names: h.team1, score: parts?.[0], won: s1 > s2 },
    { names: h.team2, score: parts?.[1], won: s2 > s1 },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: Math.min(i, 8) * 0.05 }}
      className="overflow-hidden rounded-3xl border border-outline bg-surface"
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          {h.court}
        </span>
        {h.title && (
          <span className="rounded-full bg-live-bg px-2.5 py-0.5 font-heading text-xs font-bold uppercase tracking-wider text-live">
            {h.title}
          </span>
        )}
      </div>
      <div className="px-4 pb-3 pt-1">
        {teams.map((t, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-3 py-1.5 ${idx === 0 ? "border-b border-outline" : ""}`}
          >
            {t.won ? (
              <span className="material-symbols-outlined text-lg text-lime" style={{ fontVariationSettings: "'FILL' 1" }}>
                trophy
              </span>
            ) : (
              <span className="w-[18px]" />
            )}
            <span
              className={`min-w-0 flex-1 truncate text-base ${
                t.won ? "font-semibold text-ink" : "text-ink-muted"
              }`}
            >
              {t.names[0]} &amp; {t.names[1]}
            </span>
            {t.score !== undefined && (
              <span
                className={`font-heading text-4xl font-black leading-none tabular-nums ${
                  t.won ? "text-lime" : "text-ink-muted"
                }`}
              >
                {t.score}
              </span>
            )}
          </div>
        ))}
        {!parts && (
          <p className="mt-1 text-right font-heading text-2xl font-black text-ink">{h.score}</p>
        )}
      </div>
    </motion.div>
  );
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<MatchHistoryEntry[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<Filter>("All");

  const sessionTypeParam = filter === "All" ? "" : `&sessionType=${filter.toUpperCase()}`;

  // Filter change starts the page over — offset/hasMore are only meaningful
  // for the current filter's own result set.
  useEffect(() => {
    setEntries(null);
    fetch(`/api/history?offset=0${sessionTypeParam}`)
      .then((r) => r.json())
      .then((page: { entries: MatchHistoryEntry[]; hasMore: boolean }) => {
        setEntries(page.entries);
        setHasMore(page.hasMore);
      });
  }, [sessionTypeParam]);

  async function loadMore() {
    if (!entries) return;
    setLoadingMore(true);
    const res = await fetch(`/api/history?offset=${entries.length}${sessionTypeParam}`);
    const page: { entries: MatchHistoryEntry[]; hasMore: boolean } = await res.json();
    setEntries((prev) => [...(prev ?? []), ...page.entries]);
    setHasMore(page.hasMore);
    setLoadingMore(false);
  }

  // Group consecutive matches by day + session so each block reads like a
  // results page for that night.
  const groups: { key: string; date: string; session: string; type: string; items: MatchHistoryEntry[] }[] = [];
  for (const h of entries ?? []) {
    const key = `${h.date.slice(0, 10)}|${h.sessionName}`;
    const last = groups.at(-1);
    if (last && last.key === key) last.items.push(h);
    else groups.push({ key, date: h.date, session: h.sessionName, type: h.sessionType, items: [h] });
  }

  let rowIndex = 0;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-28 pt-4 md:max-w-xl lg:max-w-2xl">
      <PageHero
        line1="Match"
        line2="Log."
        ghost="HISTORY"
        sub={
          entries
            ? `${entries.length}${hasMore ? "+" : ""} match${entries.length === 1 && !hasMore ? "" : "es"} on record`
            : "Loading results…"
        }
      >
        <Segmented
          id="history-filter"
          value={filter}
          options={FILTERS.map((f) => ({ value: f, label: f }))}
          onChange={setFilter}
        />
      </PageHero>

      {!entries ? (
        <HistorySkeleton />
      ) : entries.length === 0 ? (
        <div className="mt-10 flex flex-col items-center text-center">
          <span className="material-symbols-outlined mb-3 text-7xl text-surface-highest">history</span>
          <h3 className="font-heading text-2xl font-extrabold uppercase text-ink">No matches yet</h3>
          <p className="mt-2 max-w-xs text-sm text-ink-muted">
            Completed matches from every session in your community show up here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {groups.map((g) => {
            const d = new Date(g.date);
            return (
              <section key={g.key}>
                <div className="mb-3 flex items-end gap-3">
                  <span className="font-heading text-5xl font-black leading-none text-ink">
                    {d.getDate()}
                  </span>
                  <div className="min-w-0 pb-0.5">
                    <div className="font-heading text-sm font-extrabold uppercase tracking-wider text-lime">
                      {d.toLocaleDateString(undefined, { weekday: "short" })} &middot;{" "}
                      {d.toLocaleDateString(undefined, { month: "short" })} &middot; {g.type}
                    </div>
                    <div className="truncate text-sm text-ink-muted">{g.session}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {g.items.map((h) => (
                    <MatchRow key={h.matchId} h={h} i={rowIndex++} />
                  ))}
                </div>
              </section>
            );
          })}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="pressable flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-outline py-4 font-heading text-base font-bold uppercase tracking-wider text-ink-muted disabled:opacity-60"
            >
              {loadingMore && <Spinner className="text-lg" />}
              {loadingMore ? "Loading" : "Load more"}
            </button>
          )}
        </div>
      )}

    </main>
  );
}
