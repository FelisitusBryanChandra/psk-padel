"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Avatar } from "@/app/Avatar";
import { initialsFor } from "@/lib/initials";
import { PageHero } from "@/app/PageHero";
import { RollingNumber } from "@/app/RollingNumber";
import { Tilt } from "@/app/Tilt";
import type { CommunityStats } from "@/lib/communityStats";
import { LogoutButton } from "./LogoutButton";

const MEDAL = ["#f7cf4f", "#d5dce3", "#dd8f45"];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{children}</span>
  );
}

function BigStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <RollingNumber
        value={value}
        className={`font-heading text-6xl font-black ${accent ? "text-lime" : "text-ink"}`}
      />
      <Label>{label}</Label>
    </div>
  );
}

export default function ProfilePage() {
  const [stats, setStats] = useState<CommunityStats | null>(null);

  useEffect(() => {
    fetch("/api/profile-stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  const month = new Date().toLocaleDateString(undefined, { month: "long" });
  const maxWins = Math.max(1, ...(stats?.topThreeThisMonth.map((e) => e.wins) ?? [1]));
  const topLabels = initialsFor(stats?.topThreeThisMonth.map((e) => e.name) ?? []);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-28 pt-4 md:max-w-xl lg:max-w-2xl">
      <PageHero
        line1="The"
        line2="Crew."
        ghost="PROFILE"
        sub={
          stats ? (
            <>
              <span className="material-symbols-outlined text-base text-lime">groups</span>
              {stats.communityName}
            </>
          ) : (
            "Loading stats…"
          )
        }
      />

      {!stats ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-surface" />
          ))}
        </div>
      ) : (
        <div className="stagger flex flex-col gap-6">
          <section className="grid grid-cols-3 gap-2 rounded-3xl border border-outline bg-surface p-4">
            <BigStat label="Games" value={stats.totalGamesPlayed} accent />
            <BigStat label="Sessions" value={stats.totalSessions} />
            <BigStat label={month} value={stats.monthGamesPlayed} />
          </section>

          <section>
            <h2 className="mb-3 font-heading text-lg font-extrabold uppercase tracking-wide text-ink">
              {month} awards
            </h2>

            <Tilt className="rounded-3xl">
            <div className="relative overflow-hidden rounded-3xl bg-lime p-5 text-on-lime">
              <span aria-hidden="true" className="card-sweep" />
              <span
                aria-hidden="true"
                className="material-symbols-outlined pointer-events-none absolute -right-4 -top-4 text-[9rem] opacity-15"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                trophy
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">Most wins</span>
              <p className="mt-1 font-heading text-5xl font-black uppercase italic leading-[0.9]">
                {stats.mostWinsThisMonth?.name ?? "No winner yet"}
              </p>
              {stats.mostWinsThisMonth && (
                <p className="mt-2 font-heading text-xl font-extrabold">
                  {stats.mostWinsThisMonth.wins} wins
                </p>
              )}
            </div>
            </Tilt>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-3xl border border-outline bg-surface p-4">
                <span className="material-symbols-outlined text-2xl text-lime">bolt</span>
                <div className="mt-2">
                  <Label>Most active</Label>
                </div>
                <p className="mt-1 truncate font-heading text-2xl font-black uppercase text-ink">
                  {stats.mostActiveThisMonth?.name ?? "—"}
                </p>
                {stats.mostActiveThisMonth && (
                  <p className="text-xs text-ink-muted">
                    {stats.mostActiveThisMonth.gamesPlayed}{" "}
                    {stats.mostActiveThisMonth.gamesPlayed === 1 ? "game" : "games"}
                  </p>
                )}
              </div>
              <div className="rounded-3xl border border-outline bg-surface p-4">
                <span className="material-symbols-outlined text-2xl text-lime">handshake</span>
                <div className="mt-2">
                  <Label>Favorite duo</Label>
                </div>
                <p className="mt-1 font-heading text-2xl font-black uppercase leading-[0.95] text-ink">
                  {stats.favoriteDuoThisMonth
                    ? `${stats.favoriteDuoThisMonth.names[0]} + ${stats.favoriteDuoThisMonth.names[1]}`
                    : "—"}
                </p>
                {stats.favoriteDuoThisMonth && (
                  <p className="text-xs text-ink-muted">{stats.favoriteDuoThisMonth.count}x together</p>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-lg font-extrabold uppercase tracking-wide text-ink">
              Top 3 by wins
            </h2>
            {stats.topThreeThisMonth.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-outline p-5 text-center text-sm text-ink-muted">
                No finished matches this month yet.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.topThreeThisMonth.map((e, idx) => (
                  <div
                    key={e.playerId}
                    className="row-hover flex items-center gap-3 rounded-2xl border border-outline bg-surface px-4 py-3"
                  >
                    <Avatar name={e.name} size={40} ring={MEDAL[idx]} badge={topLabels.get(e.name)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-ink">{e.name}</p>
                      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-highest">
                        <motion.span
                          className="block h-full rounded-full bg-lime"
                          initial={{ width: 0 }}
                          animate={{ width: `${(e.wins / maxWins) * 100}%` }}
                          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 + idx * 0.1 }}
                        />
                      </span>
                    </div>
                    <span className="font-heading text-3xl font-black text-ink">{e.wins}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="pb-2">
            <LogoutButton />
          </div>
        </div>
      )}

    </main>
  );
}
