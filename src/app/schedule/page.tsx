"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const MONTHS_ID = [
  "januari",
  "februari",
  "maret",
  "april",
  "mei",
  "juni",
  "juli",
  "agustus",
  "september",
  "oktober",
  "november",
  "desember",
];

function parseIndonesianDate(text: string): Date | null {
  const m = text.match(/(\d{1,2})\s+([A-Za-z]+)/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const monthIdx = MONTHS_ID.indexOf(m[2].toLowerCase());
  if (monthIdx === -1) return null;
  return new Date(new Date().getFullYear(), monthIdx, day);
}

function parseSchedule(text: string) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const trfLine = lines.find((l) => l.startsWith("Trf ke"));
  const trfMatch = trfLine?.match(/Trf ke (.+) an (.+)/);
  const description = trfMatch?.[1] ?? "";
  const hostName = trfMatch?.[2] ?? "";

  const courtLine = lines.find((l) => l.startsWith("Court:"));
  const courtLabel = courtLine?.replace("Court:", "").trim() || "TBA";

  const listItem = /^(?:\d+[.)]|-)\s*/;
  const players = lines
    .filter((l) => listItem.test(l))
    .map((l) => l.replace(listItem, "").trim())
    .filter(Boolean);

  const dateLine = lines.find(
    (l) => l !== "Next Schedule:" && l !== trfLine && l !== courtLine && !listItem.test(l)
  );

  return { description, hostName, courtLabel, players, dateText: dateLine ?? "" };
}

function ScheduleForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"export" | "import">(
    searchParams.get("mode") === "import" ? "import" : "export"
  );

  // Export state
  const [hostName, setHostName] = useState("");
  const [description, setDescription] = useState("");
  const [dateText, setDateText] = useState("");
  const [players, setPlayers] = useState<string[]>(["", "", "", ""]);
  const [copied, setCopied] = useState(false);

  // Import state
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");

  const cleanPlayers = players.map((p) => p.trim()).filter(Boolean);
  const exportText = [
    "Next Schedule:",
    "",
    `Trf ke ${description || "..."} an ${hostName || "..."}`,
    "",
    dateText || "...",
    "Court: TBA",
    ...cleanPlayers.map((p, i) => `${i + 1}. ${p}`),
  ].join("\n");

  function copyText() {
    navigator.clipboard.writeText(exportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleImport() {
    setImportError("");
    const parsed = parseSchedule(importText);
    if (parsed.players.length === 0) {
      setImportError("Couldn't find any player names — list them one per line, e.g. \"1. Name\".");
      return;
    }

    // Date/court are a bonus when the pasted text happens to include them
    // (the old richer share-text format still round-trips), but a bare
    // numbered player list is all that's required to continue.
    const date = parseIndonesianDate(parsed.dateText);
    const mmddyyyy = date
      ? `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`
      : null;

    sessionStorage.setItem(
      "psk_import",
      JSON.stringify({
        name: mmddyyyy ? `${mmddyyyy} - ${parsed.courtLabel}` : undefined,
        date: date ? date.toISOString().slice(0, 10) : undefined,
        players: parsed.players,
      })
    );
    router.push("/session/new");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-24 md:max-w-xl lg:max-w-2xl">
      <header className="glass sticky top-0 z-10 flex items-center gap-3 px-5 py-4">
        <Link href="/" className="material-symbols-outlined text-ink">
          arrow_back
        </Link>
        <h1 className="font-heading text-lg font-black text-ink">Plan &amp; Share Schedule</h1>
      </header>

      <div className="mb-4 px-5">
        <div className="neu-inset flex rounded-xl p-1">
          <button
            onClick={() => setMode("export")}
            className={`flex-1 rounded-lg py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
              mode === "export" ? "bg-lime text-on-lime" : "text-ink-muted"
            }`}
          >
            Export
          </button>
          <button
            onClick={() => setMode("import")}
            className={`flex-1 rounded-lg py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
              mode === "import" ? "bg-lime text-on-lime" : "text-ink-muted"
            }`}
          >
            Import
          </button>
        </div>
      </div>

      {mode === "export" ? (
        <div className="flex flex-col gap-5 px-5">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-ink-muted">
              Host Name
            </span>
            <input
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="e.g. Reynaldo Christie"
              className="neu-inset h-12 rounded-xl border border-white/5 px-4 text-base text-ink outline-none focus:border-lime"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-ink-muted">
              Description
            </span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. BCA 7010342001"
              className="neu-inset h-12 rounded-xl border border-white/5 px-4 text-base text-ink outline-none focus:border-lime"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-ink-muted">
              Date &amp; Time
            </span>
            <input
              value={dateText}
              onChange={(e) => setDateText(e.target.value)}
              placeholder="e.g. Jumat 10 Juli jam 20.00-22.00"
              className="neu-inset h-12 rounded-xl border border-white/5 px-4 text-base text-ink outline-none focus:border-lime"
            />
          </label>

          <div>
            <span className="mb-2 block text-xs font-black uppercase tracking-widest text-ink-muted">
              Players
            </span>
            <div className="flex flex-col gap-2">
              {players.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={p}
                    onChange={(e) =>
                      setPlayers((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))
                    }
                    placeholder={`Player ${idx + 1}`}
                    className="h-12 flex-1 rounded-xl border-2 border-outline bg-surface-low px-4 text-base text-ink outline-none focus:border-lime"
                  />
                  <button
                    onClick={() => setPlayers((prev) => prev.filter((_, i) => i !== idx))}
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-live-bg/20 text-live"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              ))}
              <button
                onClick={() => setPlayers((prev) => [...prev, ""])}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline py-4 text-sm font-bold text-ink-muted"
              >
                <span className="material-symbols-outlined">add_circle</span>
                Add player
              </button>
            </div>
          </div>

          <div>
            <span className="mb-2 block text-xs font-black uppercase tracking-widest text-ink-muted">
              Preview
            </span>
            <pre className="neu-inset whitespace-pre-wrap rounded-xl border border-white/5 p-4 text-sm text-ink">
              {exportText}
            </pre>
          </div>

          <button
            onClick={copyText}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime py-4 font-heading text-sm font-black uppercase tracking-wide text-on-lime active:scale-[0.98] transition-transform"
          >
            <span className="material-symbols-outlined">{copied ? "check" : "content_copy"}</span>
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-5">
          <p className="text-sm text-ink-muted">
            Paste a numbered player list — that&apos;s all that&apos;s needed:
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"1. Bryan\n2. Test\n3. Test3\n4. test4"}
            rows={10}
            className="neu-inset rounded-xl border border-white/5 p-4 text-sm text-ink outline-none focus:border-lime"
          />
          {importError && <p className="text-sm text-live">{importError}</p>}
          <button
            onClick={handleImport}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime py-4 font-heading text-sm font-black uppercase tracking-wide text-on-lime active:scale-[0.98] transition-transform"
          >
            <span className="material-symbols-outlined">arrow_forward</span>
            Continue to Create Session
          </button>
        </div>
      )}
    </main>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={null}>
      <ScheduleForm />
    </Suspense>
  );
}
