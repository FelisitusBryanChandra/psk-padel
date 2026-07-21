"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Spinner } from "@/app/Spinner";

export default function NewSessionPage() {
  const router = useRouter();
  const [name, setName] = useState("PSK Padel Session");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [courtName, setCourtName] = useState("");
  const [courts, setCourts] = useState(1);
  const [dynamicCourts, setDynamicCourts] = useState(false);
  const [pointsPerMatch, setPointsPerMatch] = useState(21);
  const [pointsPerServe, setPointsPerServe] = useState(5);
  const [players, setPlayers] = useState<string[]>(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("psk_import");
    if (!raw) return;
    sessionStorage.removeItem("psk_import");
    try {
      const imported = JSON.parse(raw) as { name: string; date: string; players: string[] };
      setName(imported.name);
      setDate(imported.date);
      setPlayers(imported.players.length ? imported.players : ["", "", "", ""]);
    } catch {
      // ignore malformed import data
    }
  }, []);

  function updatePlayer(idx: number, value: string) {
    setPlayers((prev) => prev.map((p, i) => (i === idx ? value : p)));
  }

  function addPlayer() {
    setPlayers((prev) => [...prev, ""]);
  }

  function removePlayer(idx: number) {
    setPlayers((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const cleanPlayers = players.map((p) => p.trim()).filter(Boolean);

    setLoading(true);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        date,
        courtName: courtName.trim() || undefined,
        courts,
        dynamicCourts,
        pointsPerMatch,
        pointsPerServe,
        playerNames: cleanPlayers,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Could not create session");
      return;
    }

    const session = await res.json();
    router.push(`/session/${session.id}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col bg-bg pb-28">
      <header className="glass sticky top-0 z-10 flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-2xl text-ink">sports_tennis</span>
          <h1 className="font-heading text-xl font-black tracking-tight text-ink">PSK Padel</h1>
        </div>
        <Link href="/" className="material-symbols-outlined text-ink-muted" aria-label="Close">
          close
        </Link>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6 px-5 pt-2">
          <div>
            <h2 className="font-heading text-xl font-bold text-ink">Create Session</h2>
            <p className="mt-1 text-sm text-ink-muted">Set up your Americano match details.</p>
          </div>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-black uppercase tracking-widest text-ink-muted">
            Session Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Wednesday Night Fever"
            className="neu-inset h-12 rounded-xl border border-white/5 px-4 text-base text-ink outline-none transition-colors focus:border-lime"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-black uppercase tracking-widest text-ink-muted">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="neu-inset h-12 rounded-xl border border-white/5 px-4 text-base text-ink outline-none transition-colors focus:border-lime"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-black uppercase tracking-widest text-ink-muted">
            Court Name
          </span>
          <input
            value={courtName}
            onChange={(e) => setCourtName(e.target.value)}
            placeholder="e.g. PSK Arena"
            className="neu-inset h-12 rounded-xl border border-white/5 px-4 text-base text-ink outline-none transition-colors focus:border-lime"
          />
        </label>

        <div className="grid grid-cols-3 gap-2">
          <div className="neu-raised flex flex-col items-center gap-1 rounded-xl p-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
              Courts
            </span>
            <input
              type="number"
              min={1}
              value={courts}
              onChange={(e) => setCourts(Number(e.target.value))}
              className="w-full bg-transparent text-center font-heading text-lg font-bold text-lime outline-none"
            />
          </div>
          <div className="neu-raised flex flex-col items-center gap-1 rounded-xl p-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
              Max Pts
            </span>
            <input
              type="number"
              min={1}
              value={pointsPerMatch}
              onChange={(e) => setPointsPerMatch(Number(e.target.value))}
              className="w-full bg-transparent text-center font-heading text-lg font-bold text-lime outline-none"
            />
          </div>
          <div className="neu-raised flex flex-col items-center gap-1 rounded-xl p-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
              Serves
            </span>
            <input
              type="number"
              min={1}
              value={pointsPerServe}
              onChange={(e) => setPointsPerServe(Number(e.target.value))}
              className="w-full bg-transparent text-center font-heading text-lg font-bold text-lime outline-none"
            />
          </div>
        </div>

        <label className="neu-raised flex items-center justify-between rounded-xl p-3">
          <span className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-widest text-ink-muted">
              Dynamic Court
            </span>
            <span className="text-xs text-ink-muted">
              Lets you bump the court count mid-session as more courts free up.
            </span>
          </span>
          <span className="sort-toggle">
            <input
              type="checkbox"
              className="sort-toggle-input"
              checked={dynamicCourts}
              onChange={(e) => setDynamicCourts(e.target.checked)}
            />
            <span className="sort-toggle-indicator" />
          </span>
        </label>

        <div>
          <div className="mb-3 flex items-end justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-ink-muted">
              Players List
            </span>
            <span className="text-xs font-bold text-lime">
              {players.filter((p) => p.trim()).length} Players
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {players.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="neu-inset flex h-12 flex-1 items-center rounded-xl border border-white/5 px-4 transition-colors focus-within:border-lime">
                  <span className="material-symbols-outlined mr-2 text-lg text-outline">person</span>
                  <input
                    value={p}
                    onChange={(e) => updatePlayer(idx, e.target.value)}
                    placeholder={`Player ${idx + 1}`}
                    className="w-full bg-transparent text-base text-ink outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePlayer(idx)}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-live-bg/20 text-live"
                  aria-label="Remove player"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addPlayer}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline py-4 text-sm font-bold text-ink-muted transition-colors active:scale-[0.98]"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Add player
          </button>
          {players.filter((p) => p.trim()).length < 4 && (
            <p className="mt-2 text-xs text-ink-muted">
              Fewer than 4 players &mdash; the session opens for self-registration until
              enough join to start.
            </p>
          )}
        </div>

          {error && <p className="text-sm text-live">{error}</p>}
        </div>

        <div className="glass-strong fixed bottom-0 left-1/2 z-10 w-full max-w-md -translate-x-1/2 px-5 py-4">
          <button
            type="submit"
            disabled={loading}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-lime font-heading text-base font-black text-on-lime shadow-lg transition-transform active:scale-95 disabled:opacity-40"
          >
            {loading ? <Spinner className="text-xl" /> : <span className="material-symbols-outlined">bolt</span>}
            {loading ? "Creating..." : "Create Session"}
          </button>
        </div>
      </form>
    </main>
  );
}
