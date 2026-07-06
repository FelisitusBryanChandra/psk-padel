export type ServeState = {
  servingTeam: number; // 1 | 2
  team1ServerSlot: number; // 1 | 2
  team2ServerSlot: number; // 1 | 2
};

const other = (team: number) => (team === 1 ? 2 : 1);

function flipSlot(state: ServeState, team: number): ServeState {
  return team === 1
    ? { ...state, team1ServerSlot: other(state.team1ServerSlot) }
    : { ...state, team2ServerSlot: other(state.team2ServerSlot) };
}

/**
 * Auto-rotation triggered by a single +1/-1 point tap. A block of
 * `pointsPerServe` points is always served by the same player; when the
 * combined total crosses a multiple of it, serve hands to the other team
 * and the team that just finished serving remembers to alternate partners
 * next time its turn comes back around. Undoing a point (-1) reverses the
 * same handoff symmetrically.
 */
export function nextServeState(
  state: ServeState,
  prevTotal: number,
  newTotal: number,
  pointsPerServe: number
): ServeState {
  if (pointsPerServe <= 0) return state;

  if (newTotal > prevTotal && newTotal % pointsPerServe === 0) {
    const flipped = flipSlot(state, state.servingTeam);
    return { ...flipped, servingTeam: other(state.servingTeam) };
  }

  if (newTotal < prevTotal && prevTotal > 0 && prevTotal % pointsPerServe === 0) {
    const nextTeam = other(state.servingTeam);
    return flipSlot({ ...state, servingTeam: nextTeam }, nextTeam);
  }

  return state;
}

const SERVE_ORDER = [
  { team: 1, slot: 1 },
  { team: 1, slot: 2 },
  { team: 2, slot: 1 },
  { team: 2, slot: 2 },
];

/** Manual override: cycles to the next of the 4 possible servers. */
export function cycleServe(state: ServeState): ServeState {
  const currentSlot = state.servingTeam === 1 ? state.team1ServerSlot : state.team2ServerSlot;
  const currentIdx = SERVE_ORDER.findIndex(
    (o) => o.team === state.servingTeam && o.slot === currentSlot
  );
  const next = SERVE_ORDER[(currentIdx + 1) % SERVE_ORDER.length];
  return {
    servingTeam: next.team,
    team1ServerSlot: next.team === 1 ? next.slot : state.team1ServerSlot,
    team2ServerSlot: next.team === 2 ? next.slot : state.team2ServerSlot,
  };
}

export function servingPlayerId(
  state: ServeState,
  match: {
    team1Player1Id: string;
    team1Player2Id: string;
    team2Player1Id: string;
    team2Player2Id: string;
  }
): string {
  if (state.servingTeam === 1) {
    return state.team1ServerSlot === 1 ? match.team1Player1Id : match.team1Player2Id;
  }
  return state.team2ServerSlot === 1 ? match.team2Player1Id : match.team2Player2Id;
}
