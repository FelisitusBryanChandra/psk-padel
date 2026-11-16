"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Spinner } from "@/app/Spinner";
import { PageHero, Segmented } from "@/app/PageHero";
import { RollingNumber } from "@/app/RollingNumber";

const FIELD =
  "h-14 w-full rounded-2xl border-2 border-outline bg-surface px-4 text-base text-ink outline-none transition-colors duration-300 placeholder:text-ink-muted/50 focus:border-lime";

function NumberStepper({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-3xl border border-outline bg-surface px-2 py-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</span>
      <RollingNumber value={value} className="font-heading text-5xl font-black text-ink" />
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Decrease ${label}`}
          className="pressable flex h-9 w-9 items-center justify-center rounded-xl bg-surface-highest text-ink"
        >
          <span className="material-symbols-outlined text-lg">remove</span>
        </button>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label}`}
          className="pressable flex h-9 w-9 items-center justify-center rounded-xl bg-lime text-on-lime"
        >
          <span className="material-symbols-outlined text-lg">add</span>
        </button>
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end gap-3">
        <span
          className="font-heading text-6xl font-black italic leading-[0.8] text-transparent"
          style={{ WebkitTextStroke: "1.5px var(--color-lime)" }}
        >
          {n}
        </span>
        <h2 className="pb-0.5 font-heading text-2xl font-black uppercase italic text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{children}</span>;
}

function SwitchCard({
  icon,
  title,
  hint,
  checked,
  onChange,
}: {
  icon: string;
  title: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-3xl border-2 bg-surface p-4 transition-colors duration-300 ${
        checked ? "border-lime" : "border-outline"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors duration-300 ${
          checked ? "bg-lime text-on-lime" : "bg-surface-highest text-ink-muted"
        }`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </span>
      <span className="flex-1">
        <span className="block text-base font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span>
      </span>
      <span className="sort-toggle sort-toggle-stateful">
        <input
          type="checkbox"
          className="sort-toggle-input"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="sort-toggle-indicator" />
      </span>
    </label>
  );
}

export default function NewSessionPage() {
  const router = useRouter();
  const [name, setName] = useState("PSK Padel Session");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [venueName, setVenueName] = useState("");
  const [courts, setCourts] = useState(1);
  const [courtNames, setCourtNames] = useState<string[]>([""]);
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

  function setCourtCount(count: number) {
    setCourts(count);
    setCourtNames((prev) => {
      const next = prev.slice(0, count);
      while (next.length < count) next.push("");
      return next;
    });
  }

  function updateCourtName(idx: number, value: string) {
    setCourtNames((prev) => prev.map((n, i) => (i === idx ? value : n)));
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
        venueName: venueName.trim() || undefined,
        courts,
        courtNames: courtNames.map((n) => n.trim()),
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

  const playerCount = players.filter((p) => p.trim()).length;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-36 pt-4 md:max-w-xl lg:max-w-2xl">
      <PageHero
        line1="Set up"
        line2="the court."
        ghost="CREATE"
        closeHref="/"
        sub="Name it, pick the format, add the players."
      />

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-10">
        <Section n="01" title="Basics">
          <label className="flex flex-col gap-2">
            <FieldLabel>Session name</FieldLabel>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wednesday Night Fever"
              className={`${FIELD} h-16 font-heading text-2xl font-extrabold uppercase italic`}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2">
              <FieldLabel>Date</FieldLabel>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} />
            </label>
            <label className="flex flex-col gap-2">
              <FieldLabel>Venue</FieldLabel>
              <input
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="PSK Arena"
                className={FIELD}
              />
            </label>
          </div>
        </Section>

        <Section n="02" title="Format">
          <div className="flex flex-col gap-2">
            <FieldLabel>Match type</FieldLabel>
            <Segmented
              id="new-type"
              value={sessionType}
              options={[
                { value: "AMERICANO", label: "Americano" },
                { value: "MEXICANO", label: "Mexicano" },
              ]}
              onChange={setSessionType}
            />
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel>Scoring</FieldLabel>
            <Segmented
              id="new-scoring"
              value={scoringMode}
              options={[
                { value: "POINTS", label: "Race to points" },
                { value: "SET", label: "Tennis set" },
              ]}
              onChange={setScoringMode}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <NumberStepper label="Courts" value={courts} min={1} onChange={setCourtCount} />
            {scoringMode === "POINTS" ? (
              <>
                <NumberStepper label="Max pts" value={pointsPerMatch} min={1} onChange={setPointsPerMatch} />
                <NumberStepper label="Serves" value={pointsPerServe} min={1} onChange={setPointsPerServe} />
              </>
            ) : (
              <div className="col-span-2">
                <NumberStepper label="Games per set" value={gamesPerSet} min={1} onChange={setGamesPerSet} />
              </div>
            )}
          </div>

          <AnimatePresence initial={false}>
            {courts > 1 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-2 overflow-hidden"
              >
                <FieldLabel>Court names</FieldLabel>
                {courtNames.map((n, idx) => (
                  <input
                    key={idx}
                    value={n}
                    onChange={(e) => updateCourtName(idx, e.target.value)}
                    placeholder={`Court ${idx + 1} (e.g. Garuda)`}
                    className={FIELD}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {scoringMode === "SET" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <SwitchCard
                    icon="star"
                    title="Golden point"
                    hint="At deuce, the next point wins the game outright instead of playing advantage."
                    checked={goldenPoint}
                    onChange={setGoldenPoint}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <SwitchCard
              icon="link"
              title="Fixed partners"
              hint="Lock in teams for the whole session instead of rotating partners."
              checked={fixedPartners}
              onChange={setFixedPartners}
            />
            <SwitchCard
              icon="add_road"
              title="Dynamic court"
              hint="Lets you bump the court count mid-session as more courts free up."
              checked={dynamicCourts}
              onChange={setDynamicCourts}
            />
          </div>
        </Section>

        <Section n="03" title="Players">
          <div className="flex items-baseline gap-2">
            <RollingNumber value={playerCount} className="font-heading text-5xl font-black text-lime" />
            <span className="text-sm text-ink-muted">player{playerCount === 1 ? "" : "s"} in</span>
          </div>

          <div className="flex flex-col gap-2">
            {players.map((p, idx) => (
              <motion.div
                key={idx}
                layout
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="flex items-center gap-2"
              >
                <div className="flex h-14 flex-1 items-center gap-3 rounded-2xl border-2 border-outline bg-surface pl-2 pr-4 transition-colors duration-300 focus-within:border-lime">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-heading text-lg font-black transition-colors duration-300 ${
                      p.trim() ? "bg-lime text-on-lime" : "bg-surface-highest text-ink-muted"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <input
                    value={p}
                    onChange={(e) => updatePlayer(idx, e.target.value)}
                    placeholder={`Player ${idx + 1}`}
                    className="w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-muted/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePlayer(idx)}
                  className="pressable flex h-14 w-12 items-center justify-center rounded-2xl text-ink-muted active:text-live"
                  aria-label="Remove player"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </motion.div>
            ))}
          </div>
          <button
            type="button"
            onClick={addPlayer}
            className="pressable flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-outline py-4 font-heading text-base font-bold uppercase tracking-wider text-ink-muted"
          >
            <span className="material-symbols-outlined">person_add</span>
            Add player
          </button>
          {!fixedPartners && playerCount < 4 && (
            <p className="text-xs text-ink-muted">
              Fewer than 4 players &mdash; the session opens for self-registration until enough join to start.
            </p>
          )}
          {fixedPartners && cleanPlayerNames.length === 0 && (
            <p className="text-xs text-ink-muted">
              No players yet &mdash; the session opens for self-registration, and you can assign teams from
              the session page once enough people join.
            </p>
          )}
          {fixedPartners &&
            cleanPlayerNames.length > 0 &&
            (cleanPlayerNames.length < 4 || cleanPlayerNames.length % 2 !== 0) && (
              <p className="text-xs text-ink-muted">Fixed partners needs an even number of players, at least 4.</p>
            )}
        </Section>

        {fixedPartners && cleanPlayerNames.length >= 2 && (
          <Section n="04" title="Teams">
            <div className="flex items-center justify-between">
              <FieldLabel>Tap two players to pair them up</FieldLabel>
              <span className="text-xs font-bold text-lime">
                {validPairs.length} team{validPairs.length === 1 ? "" : "s"}
              </span>
            </div>

            {cleanPlayerNames.length >= 4 && cleanPlayerNames.length % 2 === 0 && (
              <button
                type="button"
                onClick={randomizePairs}
                className="pressable flex w-full items-center justify-center gap-2 rounded-2xl bg-surface-high py-3 text-sm font-semibold text-ink"
              >
                <span className="material-symbols-outlined text-lg">shuffle</span>
                Auto-assign teams
              </button>
            )}

            {unpairedNames.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {unpairedNames.map((n) => (
                  <motion.button
                    layout
                    key={n}
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => tapPlayer(n)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      selectedForPair === n ? "bg-lime text-on-lime" : "bg-surface-high text-ink"
                    }`}
                  >
                    {n}
                  </motion.button>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {validPairs.map(([a, b], idx) => (
                  <motion.div
                    layout
                    key={`${a}-${b}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-3 rounded-2xl border border-outline bg-surface px-4 py-3"
                  >
                    <span className="font-heading text-2xl font-black text-lime">{idx + 1}</span>
                    <span className="flex-1 text-base text-ink">
                      {a} <span className="text-ink-muted">+</span> {b}
                    </span>
                    <button
                      type="button"
                      onClick={() => unpair(validPairs[idx])}
                      aria-label="Unpair team"
                      className="material-symbols-outlined text-lg text-ink-muted"
                    >
                      close
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </Section>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-live">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </p>
        )}

        <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-bg via-bg/95 to-transparent pb-5 pt-10">
          <div className="mx-auto w-full max-w-md px-5 md:max-w-xl lg:max-w-2xl">
            <button type="submit" disabled={loading} className="shimmer-btn py-4! text-xl!">
              {loading ? <Spinner className="text-xl" /> : <span className="material-symbols-outlined">bolt</span>}
              {loading ? "Creating" : `Create session · ${playerCount} player${playerCount === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
