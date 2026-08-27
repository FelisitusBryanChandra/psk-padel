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

// Falls back to "Court N" when the host hasn't named that slot.
export function courtLabel(
  session: { courtNames: string[] },
  courtNumber: number
): string {
  return session.courtNames[courtNumber - 1]?.trim() || `Court ${courtNumber}`;
}

export type SessionDto = {
  id: string;
  name: string;
  date: string;
  venueName: string | null;
  courtNames: string[];
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

export function sortStandings(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort((a, b) => {
    return b.score - a.score || b.wins - a.wins || b.sd - a.sd;
  });
}

/**
 * Standard competition ranking over an already-sorted list: ties on score,
 * wins, and SD share a rank, and the next distinct value skips ahead
 * accordingly (1, 1, 3). Shared so the on-screen table and the exported image
 * agree.
 */
export function computeRanks(sorted: StandingRow[]): number[] {
  const ranks: number[] = [];
  sorted.forEach((r, idx) => {
    if (idx === 0) {
      ranks.push(1);
      return;
    }
    const prev = sorted[idx - 1];
    const tied = r.score === prev.score && r.wins === prev.wins && r.sd === prev.sd;
    ranks.push(tied ? ranks[idx - 1] : idx + 1);
  });
  return ranks;
}
