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
  courtName: string | null;
  courts: number;
  dynamicCourts: boolean;
  pointsPerMatch: number;
  pointsPerServe: number;
  scoringMode: "POINTS" | "SET";
  gamesPerSet: number;
  goldenPoint: boolean;
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
