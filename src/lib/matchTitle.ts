export type MatchTitle = "Nail-biter" | "Blowout" | null;

/**
 * A one-word fact about a finished match's final score, or null for most
 * matches — the point is that it's rare, not a badge on every row.
 * `target` is pointsPerMatch (POINTS mode) or gamesPerSet (SET mode).
 */
export function computeMatchTitle(
  scoringMode: "POINTS" | "SET",
  team1Total: number,
  team2Total: number,
  target: number
): MatchTitle {
  const margin = Math.abs(team1Total - team2Total);

  if (scoringMode === "SET") {
    if (margin <= 1) return "Nail-biter";
    if (margin >= Math.max(2, target - 1)) return "Blowout";
    return null;
  }

  if (margin <= 2) return "Nail-biter";
  if (margin >= target * 0.6) return "Blowout";
  return null;
}
