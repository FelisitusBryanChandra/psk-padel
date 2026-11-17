"use client";

import { useCallback, useEffect, useState } from "react";
import { HomeHero } from "./HomeHero";
import { SessionCard, type SessionListItem } from "./SessionCard";

function HomeSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-4 md:max-w-xl lg:max-w-2xl">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 animate-pulse rounded-full bg-surface-highest" />
          <div className="h-6 w-32 animate-pulse rounded bg-surface-highest" />
        </div>
        <div className="h-9 w-9 animate-pulse rounded-full bg-surface-highest" />
      </header>

      <div className="mb-6">
        <div className="mb-2 h-7 w-40 animate-pulse rounded bg-surface-highest" />
        <div className="h-4 w-64 animate-pulse rounded bg-surface-highest" />
      </div>

      <div className="mb-3 h-4 w-24 animate-pulse rounded bg-surface-highest" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="glass rounded-xl p-4">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <div className="mb-2 h-5 w-36 animate-pulse rounded bg-surface-highest" />
                <div className="h-4 w-20 animate-pulse rounded bg-surface-highest" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-outline/30 pt-3">
              {[0, 1, 2].map((j) => (
                <div key={j} className="neu-inset-sm h-14 animate-pulse rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default function HomePage() {
  const [sessions, setSessions] = useState<SessionListItem[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<"ongoing" | "finished">("ongoing");
  const [communityFilter, setCommunityFilter] = useState<string | "all">("all");

  const refresh = useCallback(async () => {
    const [sessionsRes, meRes] = await Promise.all([fetch("/api/sessions"), fetch("/api/me")]);
    if (sessionsRes.ok) setSessions(await sessionsRes.json());
    if (meRes.ok) setIsAdmin((await meRes.json()).role === "admin");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Keep live tickets' court scores ticking while any session is live.
  const anyLive = sessions?.some((s) => s.status === "LIVE") ?? false;
  useEffect(() => {
    if (!anyLive) return;
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [anyLive, refresh]);

  if (!sessions) {
    return <HomeSkeleton />;
  }

  // Every distinct community code currently in the list, for the admin-only
  // filter row below -- hidden entirely once there's nothing to filter
  // between (a single community, or no admin view of codes at all).
  const communities = Array.from(
    new Set(sessions.map((s) => s.communityCode).filter((c): c is string => Boolean(c)))
  ).sort();

  // Not-started sessions (no rounds generated yet, e.g. still open for
  // self-registration) count as "ongoing" alongside LIVE ones -- they're
  // not finished, so they don't belong in the Finished tab.
  const tabSessions = sessions.filter((s) => {
    const matchesTab = tab === "ongoing" ? s.status !== "COMPLETED" : s.status === "COMPLETED";
    const matchesCommunity = communityFilter === "all" || s.communityCode === communityFilter;
    return matchesTab && matchesCommunity;
  });

  const groups = new Map<string, SessionListItem[]>();
  for (const s of tabSessions) {
    const key = s.date.slice(0, 7); // YYYY-MM
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-4 md:max-w-xl lg:max-w-2xl">
      <HomeHero sessions={sessions} tab={tab} onTab={setTab} />

      {isAdmin && communities.length > 1 && (
        <div className="mb-6 -mt-2 flex flex-wrap gap-2">
          <button
            onClick={() => setCommunityFilter("all")}
            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
              communityFilter === "all"
                ? "bg-lime text-on-lime"
                : "bg-surface-highest text-ink-muted"
            }`}
          >
            All
          </button>
          {communities.map((code) => (
            <button
              key={code}
              onClick={() => setCommunityFilter(code)}
              className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                communityFilter === code
                  ? "bg-lime text-on-lime"
                  : "bg-surface-highest text-ink-muted"
              }`}
            >
              #{code}
            </button>
          ))}
        </div>
      )}

      {sessions.length === 0 && (
        <div className="mt-12 flex flex-col items-center text-center">
          <span className="material-symbols-outlined mb-4 text-7xl text-surface-highest">
            sports_tennis
          </span>
          <h3 className="font-heading text-lg font-bold text-ink">No Sessions Yet</h3>
          <p className="mt-2 max-w-xs text-sm text-ink-muted">
            Ready to dominate the court? Start your first Americano session today.
          </p>
        </div>
      )}

      {sessions.length > 0 && tabSessions.length === 0 && (
        <div className="mt-12 flex flex-col items-center text-center">
          <span className="material-symbols-outlined mb-4 text-7xl text-surface-highest">
            {tab === "ongoing" ? "sports_tennis" : "task_alt"}
          </span>
          <h3 className="font-heading text-lg font-bold text-ink">
            {tab === "ongoing" ? "Nothing Ongoing" : "No Finished Sessions"}
          </h3>
          <p className="mt-2 max-w-xs text-sm text-ink-muted">
            {tab === "ongoing"
              ? "Every session is wrapped up. Start a new one when you're ready."
              : "Sessions show up here once they're completed."}
          </p>
        </div>
      )}

      {Array.from(groups.entries()).map(([month, monthSessions]) => (
        <section key={month} className="mb-8">
          <div className="mb-3 flex items-center justify-between border-b border-outline pb-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-ink-muted">
              {new Date(`${month}-01`).toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <a
              href={`/api/export?month=${month}`}
              className="flex items-center gap-1 text-xs font-bold text-lime-dim"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Download CSV
            </a>
          </div>

          <div className="stagger flex flex-col gap-4">
            {monthSessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                showCommunity={isAdmin}
                onDeleted={refresh}
              />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
