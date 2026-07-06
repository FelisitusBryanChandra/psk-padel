"use client";

import { use, useCallback, useEffect, useState } from "react";
import { StandingsTable } from "../page";

type StandingRow = {
  playerId: string;
  name: string;
  played: number;
  wins: number;
  ties: number;
  losses: number;
  sd: number;
  missedRounds: number;
  mBonus: number;
  score: number;
};

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [name, setName] = useState("");
  const [rows, setRows] = useState<StandingRow[]>([]);

  const refresh = useCallback(async () => {
    const [sRes, stRes] = await Promise.all([
      fetch(`/api/sessions/${id}`),
      fetch(`/api/sessions/${id}/standings`),
    ]);
    if (sRes.ok) setName((await sRes.json()).name);
    if (stRes.ok) setRows(await stRes.json());
  }, [id]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col bg-bg px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <span className="material-symbols-outlined text-4xl text-lime">sports_tennis</span>
        <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-ink">
          {name || "PSK Padel"}
        </h1>
        <p className="text-xs font-black uppercase tracking-widest text-ink-muted/60">
          Live Leaderboard
        </p>
      </div>
      <StandingsTable rows={rows} sortBy="sd" />
    </main>
  );
}
