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

export function flipOnce(state: ServeState, forward: boolean): ServeState {
  if (forward) {
    const flipped = flipSlot(state, state.servingTeam);
    return { ...flipped, servingTeam: other(state.servingTeam) };
  }
  const nextTeam = other(state.servingTeam);
  return flipSlot({ ...state, servingTeam: nextTeam }, nextTeam);
}

/**
 * Auto-rotation triggered by a point change (+1/-1 tap, or a direct score
 * edit that jumps by more than one point). A block of `pointsPerServe`
 * points is always served by the same player; every time the combined
 * total crosses a multiple of it, serve hands to the other team and the
 * team that just finished serving remembers to alternate partners next
 * time its turn comes back around. A jump that crosses several boundaries
 * at once (e.g. typing a score directly) replays each handoff in order;
 * a decrease reverses them the same way, one boundary at a time.
 */
export function nextServeState(
  state: ServeState,
  prevTotal: number,
  newTotal: number,
  pointsPerServe: number
): ServeState {
  if (pointsPerServe <= 0 || newTotal === prevTotal) return state;

  const prevBlocks = Math.floor(prevTotal / pointsPerServe);
  const newBlocks = Math.floor(newTotal / pointsPerServe);
  const steps = newBlocks - prevBlocks;

  let next = state;
  for (let i = 0; i < Math.abs(steps); i++) {
    next = flipOnce(next, steps > 0);
  }
  return next;
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
