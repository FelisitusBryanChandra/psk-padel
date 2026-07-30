"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/app/Spinner";
import { LoadingModal } from "@/app/LoadingModal";
import type { SessionDto } from "@/lib/types";

export default function RegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [session, setSession] = useState<SessionDto | null>(null);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/sessions/${id}`);
    if (res.ok) setSession(await res.json());
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    setError("");
    setAdding(true);
    const res = await fetch(`/api/sessions/${id}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cleanName }),
    });
    setAdding(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Could not register");
      return;
    }

    setName("");
    refresh();
  }

  async function removePlayer(playerId: string) {
    setRemovingId(playerId);
    await fetch(`/api/sessions/${id}/players/${playerId}`, { method: "DELETE" });
    setRemovingId(null);
    refresh();
  }

  if (!session) {
    return <LoadingModal open />;
  }

  const isOpen = session.rounds.length === 0;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col bg-bg pb-28 md:max-w-xl lg:max-w-2xl">
      <header className="glass sticky top-0 z-10 flex items-center gap-3 px-5 py-4">
        <Link href={`/session/${id}`} className="material-symbols-outlined text-ink" aria-label="Back">
          arrow_back
        </Link>
        <div>
          <h1 className="font-heading text-lg font-black text-ink">Register</h1>
          <p className="text-xs text-ink-muted">{session.name}</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-5 pt-4">
        {!isOpen ? (
          <p className="text-sm text-ink-muted">
            Registration is closed &mdash; this session already started.
          </p>
        ) : (
          <form onSubmit={addPlayer} className="flex flex-col gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-ink-muted">
              Add your name
            </span>
            <div className="flex gap-2">
              <div className="neu-inset flex h-12 flex-1 items-center rounded-xl border border-white/5 px-4 transition-colors focus-within:border-lime">
                <span className="material-symbols-outlined mr-2 text-lg text-outline">person</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-transparent text-base text-ink outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={adding}
                aria-label="Add name"
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-lime text-on-lime disabled:opacity-40"
              >
                {adding ? <Spinner className="text-xl" /> : (
                  <span className="material-symbols-outlined">add</span>
                )}
              </button>
            </div>
            {error && <p className="text-sm text-live">{error}</p>}
          </form>
        )}

        <div>
          <div className="mb-3 flex items-end justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-ink-muted">
              Registered
            </span>
            <span className="text-xs font-bold text-lime">
              {session.players.length} Players
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {session.players.map(({ player }) => (
              <div
                key={player.id}
                className="neu-inset flex h-12 items-center justify-between rounded-xl border border-white/5 px-4"
              >
                <span className="flex items-center gap-2 text-base text-ink">
                  <span className="material-symbols-outlined text-lg text-outline">person</span>
                  {player.name}
                </span>
                {isOpen && (
                  <button
                    onClick={() => removePlayer(player.id)}
                    disabled={removingId === player.id}
                    aria-label={`Remove ${player.name}`}
                    className="material-symbols-outlined text-lg text-live disabled:opacity-40"
                  >
                    close
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
