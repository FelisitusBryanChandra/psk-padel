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
  sd: number;
  missedRounds: number;
  mBonus: number;
  score: number;
};
