import { flipOnce, type ServeState } from "@/lib/serve";

export type SetConfig = { gamesPerSet: number; goldenPoint: boolean };

export type SetScoreState = {
  team1Games: number;
  team2Games: number;
  team1GamePoints: number;
  team2GamePoints: number;
};

export function isTiebreak(state: SetScoreState, gamesPerSet: number): boolean {
  return state.team1Games === gamesPerSet - 1 && state.team2Games === gamesPerSet - 1;
}

function regularGameWinner(a: number, b: number, goldenPoint: boolean): 1 | 2 | null {
  const leader = Math.max(a, b);
  const trailer = Math.min(a, b);
  if (leader < 4) return null;
  // Golden point: at 3-3 (deuce), the next point decides the game outright
  // instead of requiring a 2-point lead.
  if (goldenPoint && trailer === 3) return a > b ? 1 : 2;
  if (leader - trailer >= 2) return a > b ? 1 : 2;
  return null;
}

function tiebreakWinner(a: number, b: number): 1 | 2 | null {
  if ((a >= 7 || b >= 7) && Math.abs(a - b) >= 2) return a > b ? 1 : 2;
  return null;
}

/**
 * Applies one point win to `state`, rolling a completed game/tiebreak into
 * the games count and detecting a completed set. Once both teams reach
 * gamesPerSet - 1 games, the "game" being played is a tiebreak (first to 7,
 * win by 2) rather than a regular game — golden point never applies there,
 * it's specific to deuce in a regular game.
 */
export function applySetPoint(
  state: SetScoreState,
  winner: 1 | 2,
  config: SetConfig
): SetScoreState & { setWinner: 1 | 2 | null; gameJustCompleted: boolean } {
  const tiebreak = isTiebreak(state, config.gamesPerSet);
  const team1GamePoints = winner === 1 ? state.team1GamePoints + 1 : state.team1GamePoints;
  const team2GamePoints = winner === 2 ? state.team2GamePoints + 1 : state.team2GamePoints;

  const gameWinner = tiebreak
    ? tiebreakWinner(team1GamePoints, team2GamePoints)
    : regularGameWinner(team1GamePoints, team2GamePoints, config.goldenPoint);

  if (gameWinner === null) {
    return { team1Games: state.team1Games, team2Games: state.team2Games, team1GamePoints, team2GamePoints, setWinner: null, gameJustCompleted: false };
  }

  const team1Games = state.team1Games + (gameWinner === 1 ? 1 : 0);
  const team2Games = state.team2Games + (gameWinner === 2 ? 1 : 0);
  const setWinner = team1Games >= config.gamesPerSet ? 1 : team2Games >= config.gamesPerSet ? 2 : null;

  return { team1Games, team2Games, team1GamePoints: 0, team2GamePoints: 0, setWinner, gameJustCompleted: true };
}

/**
 * Same as applySetPoint, but also advances serve state — real tennis/padel
 * serve alternates every completed game, so this just steps flipOnce()
 * (the same primitive the points-based serve rotation in serve.ts uses)
 * exactly once whenever a game just finished.
 */
export function applyPoint(
  state: SetScoreState & ServeState,
  winner: 1 | 2,
  config: SetConfig
): SetScoreState & ServeState & { setWinner: 1 | 2 | null } {
  const result = applySetPoint(state, winner, config);
  const serve = result.gameJustCompleted ? flipOnce(state, true) : state;
  return {
    team1Games: result.team1Games,
    team2Games: result.team2Games,
    team1GamePoints: result.team1GamePoints,
    team2GamePoints: result.team2GamePoints,
    servingTeam: serve.servingTeam,
    team1ServerSlot: serve.team1ServerSlot,
    team2ServerSlot: serve.team2ServerSlot,
    setWinner: result.setWinner,
  };
}

const POINT_LABELS = ["Love", "15", "30", "40"];

/** Display-only: maps raw point counts to the tennis point ladder. */
export function pointLabel(myPoints: number, oppPoints: number, tiebreak: boolean, goldenPoint: boolean): string {
  if (tiebreak) return String(myPoints);
  if (myPoints >= 3 && oppPoints >= 3) {
    if (myPoints === oppPoints) return goldenPoint ? "Golden Point" : "Deuce";
    if (goldenPoint) return "40";
    return myPoints > oppPoints ? "Ad" : "40";
  }
  return POINT_LABELS[Math.min(myPoints, 3)];
}
