"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Spinner } from "@/app/Spinner";
import { Logo } from "@/app/Logo";

export default function NewSessionPage() {
  const router = useRouter();
  const [name, setName] = useState("PSK Padel Session");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [courtName, setCourtName] = useState("");
  const [courts, setCourts] = useState(1);
  const [dynamicCourts, setDynamicCourts] = useState(false);
  const [sessionType, setSessionType] = useState<"AMERICANO" | "MEXICANO">("AMERICANO");
  const [fixedPartners, setFixedPartners] = useState(false);
  const [pairs, setPairs] = useState<[string, string][]>([]);
  const [selectedForPair, setSelectedForPair] = useState<string | null>(null);
  const [scoringMode, setScoringMode] = useState<"POINTS" | "SET">("POINTS");
  const [pointsPerMatch, setPointsPerMatch] = useState(21);
  const [pointsPerServe, setPointsPerServe] = useState(5);
  const [gamesPerSet, setGamesPerSet] = useState(4);
  const [goldenPoint, setGoldenPoint] = useState(true);
  const [players, setPlayers] = useState<string[]>(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("psk_import");
    if (!raw) return;
    sessionStorage.removeItem("psk_import");
    try {
      const imported = JSON.parse(raw) as { name?: string; date?: string; players: string[] };
      if (imported.name) setName(imported.name);
      if (imported.date) setDate(imported.date);
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

  const cleanPlayerNames = [...new Set(players.map((p) => p.trim()).filter(Boolean))];

  // Names get typed/edited freely while pairing, so a pair can go stale
  // (renamed or removed player) — filter those out at render time rather
  // than submit a partnership referencing a name that no longer exists.
  const validPairs = pairs.filter(
    ([a, b]) => cleanPlayerNames.includes(a) && cleanPlayerNames.includes(b)
  );

  const pairedNames = new Set(validPairs.flat());
  const unpairedNames = cleanPlayerNames.filter((n) => !pairedNames.has(n));

  function tapPlayer(namePlayer: string) {
    if (selectedForPair === null) {
      setSelectedForPair(namePlayer);
    } else if (selectedForPair === namePlayer) {
      setSelectedForPair(null);
    } else {
      setPairs((prev) => [...prev, [selectedForPair, namePlayer]]);
      setSelectedForPair(null);
    }
  }

  function unpair(pair: [string, string]) {
    setPairs((prev) => prev.filter((p) => p !== pair));
  }

  function randomizePairs() {
    const shuffled = [...cleanPlayerNames];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const randomPairs: [string, string][] = [];
    for (let i = 0; i + 1 < shuffled.length; i += 2) {
      randomPairs.push([shuffled[i], shuffled[i + 1]]);
    }
    setPairs(randomPairs);
    setSelectedForPair(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // An empty roster is a valid draft (players self-register later, and
    // teams get assigned from the session page once they have) — the
    // even-count/all-paired checks only apply once names are typed in here.
    if (fixedPartners && cleanPlayerNames.length > 0) {
      if (cleanPlayerNames.length < 4 || cleanPlayerNames.length % 2 !== 0) {
        setError("Fixed partners requires an even number of players, at least 4");
        return;
      }
      if (unpairedNames.length > 0) {
        setError("Pair up every player before creating the session");
        return;
      }
    }

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
        sessionType,
        fixedPartners,
        partnerships: fixedPartners ? validPairs : undefined,
        scoringMode,
        pointsPerMatch,
        pointsPerServe,
        gamesPerSet,
        goldenPoint,
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col bg-bg pb-28 md:max-w-xl lg:max-w-2xl">
      <header className="glass sticky top-0 z-10 flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <Logo className="h-6 w-auto text-ink" />
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
          {scoringMode === "POINTS" ? (
            <>
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
            </>
          ) : (
            <div className="neu-raised col-span-2 flex flex-col items-center gap-1 rounded-xl p-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
                Games per Set
              </span>
              <input
                type="number"
                min={1}
                value={gamesPerSet}
                onChange={(e) => setGamesPerSet(Number(e.target.value))}
                className="w-full bg-transparent text-center font-heading text-lg font-bold text-lime outline-none"
              />
            </div>
          )}
        </div>

        <div>
          <span className="mb-2 block text-xs font-black uppercase tracking-widest text-ink-muted">
            Match Type
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(["AMERICANO", "MEXICANO"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSessionType(type)}
                className={`rounded-xl py-3 text-sm font-bold capitalize transition-colors ${
                  sessionType === type
                    ? "bg-lime text-on-lime"
                    : "neu-raised text-ink-muted"
                }`}
              >
                {type === "AMERICANO" ? "Americano" : "Mexicano"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-xs font-black uppercase tracking-widest text-ink-muted">
            Scoring
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(["POINTS", "SET"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setScoringMode(mode)}
                className={`rounded-xl py-3 text-sm font-bold capitalize transition-colors ${
                  scoringMode === mode ? "bg-lime text-on-lime" : "neu-raised text-ink-muted"
                }`}
              >
                {mode === "POINTS" ? "Race to Points" : "Tennis Set"}
              </button>
            ))}
          </div>
        </div>

        {scoringMode === "SET" && (
          <label className="neu-raised flex items-center justify-between rounded-xl p-3">
            <span className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-widest text-ink-muted">
                Golden Point
              </span>
              <span className="text-xs text-ink-muted">
                At deuce, the next point wins the game outright instead of playing advantage.
              </span>
            </span>
            <span className="sort-toggle sort-toggle-stateful">
              <input
                type="checkbox"
                className="sort-toggle-input"
                checked={goldenPoint}
                onChange={(e) => setGoldenPoint(e.target.checked)}
              />
              <span className="sort-toggle-indicator" />
            </span>
          </label>
        )}

        <label className="neu-raised flex items-center justify-between rounded-xl p-3">
          <span className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-widest text-ink-muted">
              Fixed Partners
            </span>
            <span className="text-xs text-ink-muted">
              Lock in teams for the whole session instead of rotating partners.
            </span>
          </span>
          <span className="sort-toggle sort-toggle-stateful">
            <input
              type="checkbox"
              className="sort-toggle-input"
              checked={fixedPartners}
              onChange={(e) => setFixedPartners(e.target.checked)}
            />
            <span className="sort-toggle-indicator" />
          </span>
        </label>

        <label className="neu-raised flex items-center justify-between rounded-xl p-3">
          <span className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-widest text-ink-muted">
              Dynamic Court
            </span>
            <span className="text-xs text-ink-muted">
              Lets you bump the court count mid-session as more courts free up.
            </span>
          </span>
          <span className="sort-toggle sort-toggle-stateful">
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
          {!fixedPartners && players.filter((p) => p.trim()).length < 4 && (
            <p className="mt-2 text-xs text-ink-muted">
              Fewer than 4 players &mdash; the session opens for self-registration until
              enough join to start.
            </p>
          )}
          {fixedPartners && cleanPlayerNames.length === 0 && (
            <p className="mt-2 text-xs text-ink-muted">
              No players yet &mdash; the session opens for self-registration, and you can
              assign teams from the session page once enough people join.
            </p>
          )}
          {fixedPartners &&
            cleanPlayerNames.length > 0 &&
            (cleanPlayerNames.length < 4 || cleanPlayerNames.length % 2 !== 0) && (
              <p className="mt-2 text-xs text-ink-muted">
                Fixed partners needs an even number of players, at least 4.
              </p>
            )}
        </div>

        {fixedPartners && cleanPlayerNames.length >= 2 && (
          <div>
            <div className="mb-3 flex items-end justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-ink-muted">
                Assign Teams
              </span>
              <span className="text-xs font-bold text-lime">
                {validPairs.length} Team{validPairs.length === 1 ? "" : "s"}
              </span>
            </div>

            {cleanPlayerNames.length >= 4 && cleanPlayerNames.length % 2 === 0 && (
              <button
                type="button"
                onClick={randomizePairs}
                className="neu-raised mb-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-ink-muted transition-colors active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-lg">shuffle</span>
                Auto-Assign Teams
              </button>
            )}

            {unpairedNames.length > 0 && (
              <div className="mb-3">
                <p className="mb-2 text-xs text-ink-muted">
                  Tap two players to pair them up.
                </p>
                <div className="flex flex-wrap gap-2">
                  {unpairedNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => tapPlayer(name)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                        selectedForPair === name
                          ? "bg-lime text-on-lime"
                          : "neu-raised text-ink-muted"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {validPairs.map(([a, b], idx) => (
                <div
                  key={`${a}-${b}`}
                  className="neu-inset-sm flex items-center justify-between rounded-xl px-4 py-2"
                >
                  <span className="text-sm text-ink">
                    Team {idx + 1}: {a} &amp; {b}
                  </span>
                  <button
                    type="button"
                    onClick={() => unpair(validPairs[idx])}
                    aria-label="Unpair team"
                    className="material-symbols-outlined text-lg text-ink-muted"
                  >
                    close
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

          {error && <p className="text-sm text-live">{error}</p>}
        </div>

        <div className="glass-strong fixed bottom-0 left-1/2 z-10 w-full max-w-md -translate-x-1/2 px-5 py-4 md:max-w-xl lg:max-w-2xl">
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
