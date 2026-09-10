import { computeRanks, sortStandings, type StandingRow } from "@/lib/types";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w[0]));
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

const MEDAL_STYLE = [
  "bg-gradient-to-br from-gold to-amber-800 text-black",
  "bg-gradient-to-br from-silver to-slate-500 text-black",
  "bg-gradient-to-br from-bronze to-orange-950 text-black",
];

// Exact gold/silver/bronze recipe from the design handoff (PSK Padel
// Petrol.dc.html) — absolute hex, not theme tokens, since a medal's color
// doesn't change with light/dark mode.
// `ring` is the exact handoff value (border tint + radial background wash);
// `glow` is a punchier variant of the same color for the outer shadow —
// the flat spec value alone read as too faint once actually on-screen.
const METAL = [
  {
    grad: "linear-gradient(150deg, #fff6cf 0%, #f7cf4f 46%, #b9860c 100%)",
    ring: "rgba(247,207,79,0.50)",
    glow: "rgba(247,207,79,0.85)",
    ink: "#3d2a00",
  },
  {
    grad: "linear-gradient(150deg, #ffffff 0%, #d5dce3 46%, #8b96a3 100%)",
    ring: "rgba(196,206,218,0.45)",
    glow: "rgba(210,220,232,0.85)",
    ink: "#232a31",
  },
  {
    grad: "linear-gradient(150deg, #ffe0bd 0%, #dd8f45 46%, #94531d 100%)",
    ring: "rgba(221,143,69,0.46)",
    glow: "rgba(221,143,69,0.85)",
    ink: "#3a1d00",
  },
];

function medalChipStyle(place: number, size: number): React.CSSProperties {
  const m = METAL[place];
  return {
    width: size,
    height: size,
    flex: `0 0 ${size}px`,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: Math.round(size * 0.46),
    fontWeight: 800,
    fontVariantNumeric: "tabular-nums",
    background: m.grad,
    color: m.ink,
    boxShadow: `0 0 0 3px ${m.ring}, 0 6px 14px -4px ${m.ring}, inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -2px 4px rgba(0,0,0,0.18)`,
  };
}

function Podium({ top3 }: { top3: StandingRow[] }) {
  return (
    <div className="mb-3 grid grid-cols-3 gap-3">
      {top3.map((r, place) => (
        <div
          key={r.playerId}
          className={`glass rounded-[20px] border-2! p-[18px] ${place === 0 ? "-translate-y-1.5" : ""}`}
          style={{
            backgroundImage: `radial-gradient(130% 100% at 50% -25%, ${METAL[place].ring} 0%, transparent 72%)`,
            borderColor: METAL[place].glow,
            boxShadow: `0 16px 38px -14px var(--shadow-neu-dark), 0 6px 30px -4px ${METAL[place].glow}, 0 0 40px -12px ${METAL[place].glow}, inset 0 1px 0 var(--shadow-neu-light)`,
          }}
        >
          <div style={medalChipStyle(place, 34)}>{place + 1}</div>
          <div className="mt-2.5 truncate font-heading text-sm font-bold leading-tight text-ink">
            {r.name}
          </div>
          <div className="mt-1 font-heading text-xl font-extrabold tabular-nums text-ink">
            {r.score}
          </div>
        </div>
      ))}
    </div>
  );
}

export function StandingsTable({
  rows,
  scoreLabel = "Score",
}: {
  rows: StandingRow[];
  scoreLabel?: string;
}) {
  const sorted = sortStandings(rows);

  const ranks = computeRanks(sorted);

  return (
    <div>
      {sorted.length >= 3 && <Podium top3={sorted.slice(0, 3)} />}
      <div className="glass overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left">
          <thead>
            <tr className="border-b border-outline bg-surface-high/50">
              <th className="w-12 px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-ink-muted">
                #
              </th>
              <th className="px-2 py-3 text-[10px] font-black uppercase tracking-widest text-ink-muted">
                Player
              </th>
              <th className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-widest text-ink-muted">
                W-T-L
              </th>
              <th className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-widest text-ink-muted">
                SD
              </th>
              <th className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-widest text-ink-muted">
                +M
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-ink-muted">
                {scoreLabel}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline/20">
            {sorted.map((r, idx) => {
              const onFire = r.winStreak >= 3;

              return (
                <tr
                  key={r.playerId}
                  className={onFire ? "streak-row" : "transition-colors hover:bg-surface-high"}
                >
                  <td className="px-4 py-3 text-center">
                    <div
                      className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
                        ranks[idx] <= 3 ? MEDAL_STYLE[ranks[idx] - 1] : "bg-outline/30 text-ink-muted"
                      }`}
                    >
                      {ranks[idx]}
                    </div>
                  </td>
                  <td className="min-w-0 px-2 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-highest">
                        <span className="text-xs font-black text-ink/50">{initials(r.name)}</span>
                      </div>
                      <span className="min-w-0 flex-1 truncate font-bold text-ink">{r.name}</span>
                      {onFire && (
                        <div className="streak-badge flex-shrink-0">
                          <span className="streak-flame" />
                          <span className="font-heading text-[11px] font-extrabold tracking-wide text-flame-ink tabular-nums">
                            <span className="hidden sm:inline">{r.winStreak} in a row</span>
                            <span className="sm:hidden">{r.winStreak}x</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center tabular-nums text-ink-muted">
                    {r.wins}-{r.ties}-{r.losses}
                  </td>
                  <td
                    className={`px-2 py-3 text-center font-bold tabular-nums ${
                      r.sd > 0 ? "text-lime-dim" : r.sd < 0 ? "text-live" : "text-ink-muted"
                    }`}
                  >
                    {r.sd > 0 ? `+${r.sd}` : r.sd}
                  </td>
                  <td className="px-2 py-3 text-center font-bold tabular-nums text-accent-orange">
                    {r.mBonus ? `+${r.mBonus}` : ""}
                  </td>
                  <td className="px-4 py-3 text-right font-heading text-lg font-black tabular-nums text-ink">
                    {r.score}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}
