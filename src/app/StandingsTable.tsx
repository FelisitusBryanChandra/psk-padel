import { sortStandings, type StandingRow } from "@/lib/types";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

const MEDAL_STYLE = [
  "bg-gradient-to-br from-gold to-yellow-700 text-black",
  "bg-gradient-to-br from-silver to-slate-500 text-black",
  "bg-gradient-to-br from-bronze to-amber-800 text-black",
];

export function StandingsTable({
  rows,
  sortBy,
}: {
  rows: StandingRow[];
  sortBy: "sd" | "score";
}) {
  const sorted = sortStandings(rows, sortBy);

  // Standard competition ranking: ties on the active sort key share a rank,
  // and the next distinct value skips ahead accordingly (1, 1, 3).
  const ranks: number[] = [];
  sorted.forEach((r, idx) => {
    if (idx === 0) {
      ranks.push(1);
      return;
    }
    const prev = sorted[idx - 1];
    const tied = sortBy === "sd" ? r.sd === prev.sd : r.score === prev.score;
    ranks.push(tied ? ranks[idx - 1] : idx + 1);
  });

  return (
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
                Score
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline/20">
            {sorted.map((r, idx) => (
              <tr key={r.playerId} className="transition-colors hover:bg-surface-high">
                <td className="px-4 py-3 text-center">
                  <div
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
                      ranks[idx] <= 3 ? MEDAL_STYLE[ranks[idx] - 1] : "bg-outline/30 text-ink-muted"
                    }`}
                  >
                    {ranks[idx]}
                  </div>
                </td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-highest">
                      <span className="text-xs font-black text-ink/50">{initials(r.name)}</span>
                    </div>
                    <span className="font-bold text-ink">{r.name}</span>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
