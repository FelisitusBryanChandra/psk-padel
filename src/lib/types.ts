export type PlayerRef = { id: string; name: string };

export type MatchDto = {
  id: string;
  courtNumber: number;
  team1Player1: PlayerRef;
  team1Player2: PlayerRef;
  team2Player1: PlayerRef;
  team2Player2: PlayerRef;
  team1Score: number;
  team2Score: number;
  team1Games: number;
  team2Games: number;
  team1GamePoints: number;
  team2GamePoints: number;
  completed: boolean;
  servingTeam: number;
  team1ServerSlot: number;
  team2ServerSlot: number;
};

export type RoundDto = { id: string; roundNumber: number; matches: MatchDto[] };

export type SessionDto = {
  id: string;
  name: string;
  date: string;
  courtName: string | null;
  courts: number;
  dynamicCourts: boolean;
  pointsPerMatch: number;
  pointsPerServe: number;
  scoringMode: "POINTS" | "SET";
  gamesPerSet: number;
  goldenPoint: boolean;
  fixedPartners: boolean;
  fixedPartnerships: { player1Id: string; player2Id: string }[];
  players: { player: PlayerRef }[];
  rounds: RoundDto[];
};

export type StandingRow = {
  playerId: string;
  name: string;
  played: number;
  wins: number;
  ties: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  sd: number;
  missedRounds: number;
  mBonus: number;
  score: number;
};

export function sortStandings(rows: StandingRow[], by: "sd" | "score"): StandingRow[] {
  return [...rows].sort((a, b) => {
    const primary = by === "sd" ? b.sd - a.sd : b.score - a.score;
    if (primary !== 0) return primary;
    return b.score - a.score || b.wins - a.wins;
  });
}

/**
 * Standard competition ranking over an already-sorted list: ties on the active
 * sort key share a rank, and the next distinct value skips ahead accordingly
 * (1, 1, 3). Shared so the on-screen table and the exported image agree.
 */
export function computeRanks(sorted: StandingRow[], by: "sd" | "score"): number[] {
  const ranks: number[] = [];
  sorted.forEach((r, idx) => {
    if (idx === 0) {
      ranks.push(1);
      return;
    }
    const prev = sorted[idx - 1];
    const tied = by === "sd" ? r.sd === prev.sd : r.score === prev.score;
    ranks.push(tied ? ranks[idx - 1] : idx + 1);
  });
  return ranks;
}
