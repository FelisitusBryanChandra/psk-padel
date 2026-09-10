"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/app/BottomNav";
import { Logo } from "@/app/Logo";
import { SideNav } from "@/app/SideNav";
import { Spinner } from "@/app/Spinner";
import { ThemeToggle } from "@/app/ThemeToggle";
import type { MatchHistoryEntry } from "@/lib/matchHistory";

const FILTERS = ["All", "Americano", "Mexicano"] as const;
type Filter = (typeof FILTERS)[number];

function HistorySkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-4 md:max-w-xl lg:max-w-2xl">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 animate-pulse rounded-full bg-surface-highest" />
          <div className="h-6 w-32 animate-pulse rounded bg-surface-highest" />
        </div>
        <div className="h-9 w-9 animate-pulse rounded-full bg-surface-highest" />
      </header>
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="glass-strong h-20 animate-pulse rounded-xl" />
        ))}
      </div>
    </main>
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

  if (!entries) {
    return <HistorySkeleton />;
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-4 md:max-w-xl lg:max-w-2xl">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-auto text-ink" />
          <h1 className="font-heading text-2xl font-black tracking-tight text-ink">History</h1>
        </div>
        <ThemeToggle />
      </header>

      <div className="mb-6 flex gap-2">
        {FILTERS.map((label) => (
          <button
            key={label}
            onClick={() => setFilter(label)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              filter === label ? "bg-lime text-on-lime" : "neu-raised text-ink-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <span className="material-symbols-outlined mb-4 text-7xl text-surface-highest">
            history
          </span>
          <h3 className="font-heading text-lg font-bold text-ink">No Matches Yet</h3>
          <p className="mt-2 max-w-xs text-sm text-ink-muted">
            Completed matches from every session in your community show up here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((h) => (
            <div
              key={h.matchId}
              className="glass-strong grid grid-cols-[4px_1fr_auto] items-center gap-4 rounded-xl p-4"
            >
              <div
                className={`h-11 w-1 rounded-full ${
                  h.sessionType === "AMERICANO" ? "bg-lime" : "bg-accent-blue"
                }`}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-ink-muted">
                    {h.sessionType}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {new Date(h.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    &middot; {h.court}
                  </span>
                  {h.title && (
                    <span className="rounded-full bg-live-bg/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-live">
                      {h.title}
                    </span>
                  )}
                </div>
                <div className="mt-1 truncate text-sm font-semibold text-ink">
                  {h.team1[0]} &amp; {h.team1[1]}
                </div>
                <div className="mt-0.5 truncate text-sm text-ink-muted">
                  vs {h.team2[0]} &amp; {h.team2[1]}
                </div>
              </div>
              <div className="font-heading text-xl font-bold tabular-nums text-ink">{h.score}</div>
            </div>
          ))}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="neu-raised flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-ink-muted transition-colors disabled:opacity-60"
            >
              {loadingMore && <Spinner className="text-lg" />}
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          )}
        </div>
      )}

      <SideNav />
      <BottomNav />
    </main>
  );
}
