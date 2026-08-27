import { prisma } from "@/lib/prisma";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * One greedy attempt at partitioning `playing` into groups of 4, preferring
 * partners who haven't played together yet. Greedy-with-no-lookahead can
 * still back itself into forced repeats, so this also returns a penalty
 * (sum of prior-partner-counts for every pair it formed) so the caller can
 * try several shuffles and keep the lowest-penalty attempt.
 */
function attemptGroups(playing: string[], partnerCount: Map<string, number>) {
  const pool = shuffle(playing);
  const groups: string[][] = [];
  let penalty = 0;

  while (pool.length >= 4) {
    const p1 = pool.shift()!;
    let bestIdx = 0;
    let bestCount = Infinity;
    for (let i = 0; i < pool.length; i++) {
      const c = partnerCount.get(pairKey(p1, pool[i])) ?? 0;
      if (c < bestCount) {
        bestCount = c;
        bestIdx = i;
      }
    }
    const p2 = pool.splice(bestIdx, 1)[0];
    penalty += bestCount;

    const p3 = pool.shift()!;
    let bestIdx2 = 0;
    let bestCount2 = Infinity;
    for (let i = 0; i < pool.length; i++) {
      const c = partnerCount.get(pairKey(p3, pool[i])) ?? 0;
      if (c < bestCount2) {
        bestCount2 = c;
        bestIdx2 = i;
      }
    }
    const p4 = pool.splice(bestIdx2, 1)[0];
    penalty += bestCount2;

    groups.push([p1, p2, p3, p4]);
  }

  return { groups, penalty };
}

type HistoryRound = {
  roundNumber: number;
  matches: {
    team1Player1Id: string;
    team1Player2Id: string;
    team2Player1Id: string;
    team2Player2Id: string;
    team1Score: number;
    team2Score: number;
    completed: boolean;
  }[];
};

function computeGamesPlayed(playerIds: string[], history: HistoryRound[]): Map<string, number> {
  const gamesPlayed = new Map<string, number>(playerIds.map((id) => [id, 0]));
  for (const round of history) {
    for (const m of round.matches) {
      const slots = [m.team1Player1Id, m.team1Player2Id, m.team2Player1Id, m.team2Player2Id];
      for (const id of slots) {
        gamesPlayed.set(id, (gamesPlayed.get(id) ?? 0) + 1);
      }
    }
  }
  return gamesPlayed;
}

function teamKey(team: [string, string]): string {
  return pairKey(team[0], team[1]);
}

function selectPlayingTeams(
  teams: [string, string][],
  courts: number,
  gamesPlayed: Map<string, number>
): [string, string][] {
  const capacityTeams = courts * 2;
  const ranked = shuffle(teams).sort(
    (a, b) => (gamesPlayed.get(a[0]) ?? 0) - (gamesPlayed.get(b[0]) ?? 0)
  );
  return ranked.slice(0, Math.min(capacityTeams, ranked.length));
}

function computePointsSoFar(playerIds: string[], history: HistoryRound[]): Map<string, number> {
  const points = new Map<string, number>(playerIds.map((id) => [id, 0]));
  for (const round of history) {
    for (const m of round.matches) {
      if (!m.completed) continue;
      for (const id of [m.team1Player1Id, m.team1Player2Id]) {
        points.set(id, (points.get(id) ?? 0) + m.team1Score);
      }
      for (const id of [m.team2Player1Id, m.team2Player2Id]) {
        points.set(id, (points.get(id) ?? 0) + m.team2Score);
      }
    }
  }
  return points;
}

function teamPointsSpread(teams: [string, string][], points: Map<string, number>): number {
  const vals = teams.map((t) => points.get(t[0]) ?? 0);
  return Math.max(...vals) - Math.min(...vals);
}

/**
 * Mexicano-specific team selection: fairness (fewest games played) still
 * decides who's eligible to play, but ties are no longer broken by pure
 * random shuffle the way selectPlayingTeams does for Americano. Mexicano's
 * whole premise is rank-proximity matchmaking, so a random pick among
 * fairness-tied teams can seat a top-ranked team against a bottom-ranked one
 * just because they both happened to be due a game. When more teams are
 * tied at the fairness floor than there are slots, several random subsets
 * are tried and the one with the smallest points spread is kept — still
 * randomized (so play doesn't lock into a repeating block, same trap the
 * comment on selectPlayingTeams describes), but biased toward keeping the
 * field close.
 *
 * A combined fairness+rank cost function (weighting a small games-played
 * tolerance against points spread, modeled on FIDE Swiss pairing) was
 * tried and measured against this version over thousands of simulated
 * rounds — it was not a reliable improvement (comparable or slightly worse
 * average rank gap, and it let fairness slip further), so it was reverted
 * in favor of this simpler, already-verified approach. Repeat-pairing
 * concentration on very low court counts (e.g. 1 court / 6 teams) is a
 * structural feature of that scenario, not a tie-breaking defect — neither
 * version meaningfully changes it.
 */
function selectMexicanoPlayingTeams(
  teams: [string, string][],
  courts: number,
  gamesPlayed: Map<string, number>,
  points: Map<string, number>,
  hasResults: boolean
): [string, string][] {
  const capacityTeams = courts * 2;
  if (teams.length <= capacityTeams) return teams;

  const minGames = Math.min(...teams.map((t) => gamesPlayed.get(t[0]) ?? 0));
  const floor = teams.filter((t) => (gamesPlayed.get(t[0]) ?? 0) === minGames);

  if (floor.length <= capacityTeams) {
    const rest = teams
      .filter((t) => (gamesPlayed.get(t[0]) ?? 0) !== minGames)
      .sort((a, b) => (gamesPlayed.get(a[0]) ?? 0) - (gamesPlayed.get(b[0]) ?? 0));
    return [...shuffle(floor), ...rest].slice(0, capacityTeams);
  }

  if (!hasResults) return shuffle(floor).slice(0, capacityTeams);

  let best = shuffle(floor).slice(0, capacityTeams);
  let bestSpread = teamPointsSpread(best, points);
  for (let i = 0; i < 50 && bestSpread > 0; i++) {
    const attempt = shuffle(floor).slice(0, capacityTeams);
    const spread = teamPointsSpread(attempt, points);
    if (spread < bestSpread) {
      best = attempt;
      bestSpread = spread;
    }
  }
  return best;
}

/**
 * Pure scheduling core (no DB): picks who sits out and who partners whom
 * for the next round, given the full match history so far. Split out from
 * generateNextRound so it can be simulated/tested without Prisma.
 *
 * Who plays is ranked by fewest games played first; ties are broken by the
 * random shuffle rather than a secondary "longest since last played" sort.
 * That secondary sort was tried and reverted: when player count is an exact
 * multiple of court capacity (e.g. 8 players / 1 court), everyone in the
 * resting group ties on both games-played and last-played-round, so the
 * tiebreak stops being a tiebreak and instead permanently separates players
 * into two static blocks that alternate forever without ever mixing. Random
 * tie-breaking avoids that trap.
 *
 * Partnering then runs many randomized attempts and keeps the one with the
 * fewest repeat partnerships, since a single greedy pass isn't enough to
 * reliably find a zero-repeat schedule even when one exists (e.g. 8
 * players / 2 courts).
 */
export function planNextRound(playerIds: string[], courts: number, history: HistoryRound[]) {
  const gamesPlayed = computeGamesPlayed(playerIds, history);
  const partnerCount = new Map<string, number>();

  for (const round of history) {
    for (const m of round.matches) {
      const k1 = pairKey(m.team1Player1Id, m.team1Player2Id);
      const k2 = pairKey(m.team2Player1Id, m.team2Player2Id);
      partnerCount.set(k1, (partnerCount.get(k1) ?? 0) + 1);
      partnerCount.set(k2, (partnerCount.get(k2) ?? 0) + 1);
    }
  }

  const capacity = courts * 4;
  const ranked = shuffle(playerIds).sort(
    (a, b) => (gamesPlayed.get(a) ?? 0) - (gamesPlayed.get(b) ?? 0)
  );
  const playing = ranked.slice(0, Math.min(capacity, ranked.length));

  let best = attemptGroups(playing, partnerCount);
  for (let i = 0; i < 800 && best.penalty > 0; i++) {
    const attempt = attemptGroups(playing, partnerCount);
    if (attempt.penalty < best.penalty) best = attempt;
  }
  return best.groups;
}

/**
 * One greedy attempt at pairing playing teams against each other, preferring
 * opponents they haven't faced yet. Mirrors attemptGroups' greedy-with-retry
 * shape but one level up: once partners are fixed, "avoid repeat partners"
 * has nothing left to do, so fixed-partner fairness is about avoiding
 * repeat *opponents* instead.
 */
function attemptTeamMatchups(teams: [string, string][], opponentCount: Map<string, number>) {
  const pool = shuffle(teams);
  const groups: string[][] = [];
  let penalty = 0;

  while (pool.length >= 2) {
    const t1 = pool.shift()!;
    let bestIdx = 0;
    let bestCount = Infinity;
    for (let i = 0; i < pool.length; i++) {
      const c = opponentCount.get(pairKey(teamKey(t1), teamKey(pool[i]))) ?? 0;
      if (c < bestCount) {
        bestCount = c;
        bestIdx = i;
      }
    }
    const t2 = pool.splice(bestIdx, 1)[0];
    penalty += bestCount;
    groups.push([...t1, ...t2]);
  }

  return { groups, penalty };
}

/**
 * Fixed-partner Americano: teams are locked for the whole session, so
 * pairing is about avoiding repeat *opponents* rather than repeat partners
 * — the same anti-repeat philosophy planNextRound uses, just one level up.
 * Sit-out fairness operates on whole teams (selectPlayingTeams), never
 * splitting a pair between playing and sitting out.
 */
export function planNextFixedPartnerRound(
  courts: number,
  history: HistoryRound[],
  partnerships: [string, string][]
) {
  const allPlayerIds = partnerships.flat();
  const gamesPlayed = computeGamesPlayed(allPlayerIds, history);
  const playingTeams = selectPlayingTeams(partnerships, courts, gamesPlayed);

  const opponentCount = new Map<string, number>();
  for (const round of history) {
    for (const m of round.matches) {
      const k1 = teamKey([m.team1Player1Id, m.team1Player2Id]);
      const k2 = teamKey([m.team2Player1Id, m.team2Player2Id]);
      const key = pairKey(k1, k2);
      opponentCount.set(key, (opponentCount.get(key) ?? 0) + 1);
    }
  }

  let best = attemptTeamMatchups(playingTeams, opponentCount);
  for (let i = 0; i < 800 && best.penalty > 0; i++) {
    const attempt = attemptTeamMatchups(playingTeams, opponentCount);
    if (attempt.penalty < best.penalty) best = attempt;
  }
  return best.groups;
}

/**
 * Within one rank-block of 4 (already sorted best to worst), pairs rank 1
 * with rank 4 against rank 2 with rank 3 — the standard Mexicano rule, and
 * the one that keeps that match closest (it splits the score gap evenly
 * across both teams). 1-3/2-4 is the other pairing real Mexicano tools use;
 * it's a bit less balanced but still reasonable. 1-2/3-4 (stacking the two
 * strongest together) isn't a real variant anywhere and is deliberately
 * left out — it produces the most lopsided match of the three.
 */
function mexicanoBlockSplits(
  rank1: string,
  rank2: string,
  rank3: string,
  rank4: string
): { team1: [string, string]; team2: [string, string] }[] {
  return [
    { team1: [rank1, rank4], team2: [rank2, rank3] },
    { team1: [rank1, rank3], team2: [rank2, rank4] },
  ];
}

/**
 * Mexicano scheduling core. Round 1 (no scores yet) shuffles like Americano
 * does; every round after that ranks the playing group by points scored so
 * far and pairs off each block of four by rank. Unlike Americano, pairing
 * isn't primarily about avoiding repeat partners — it's rank-based, to keep
 * matches close — but real Mexicano tools still track partner history and
 * avoid repeats where they can: for each block, the standard 1-4/2-3 split
 * is used unless it would repeat a partnership from earlier in the session,
 * in which case the 1-3/2-4 split is used instead.
 *
 * Fixed partnerships skip individual pairing entirely: a `[playerId,
 * playerId]` tuple is a locked team, so fairness and ranking both operate
 * on whole teams (a team can't be split — either both partners sit out or
 * both play), and each round just decides which team plays which other
 * team.
 */
export function planNextMexicanoRound(
  playerIds: string[],
  courts: number,
  history: HistoryRound[],
  fixedPartnerships: [string, string][] = []
) {
  const gamesPlayed = computeGamesPlayed(playerIds, history);
  const points = computePointsSoFar(playerIds, history);
  const hasResults = history.some((round) => round.matches.some((m) => m.completed));

  if (fixedPartnerships.length > 0) {
    const playingTeams = selectMexicanoPlayingTeams(
      fixedPartnerships,
      courts,
      gamesPlayed,
      points,
      hasResults
    );

    const ordered = hasResults
      ? [...playingTeams].sort((a, b) => (points.get(b[0]) ?? 0) - (points.get(a[0]) ?? 0))
      : shuffle(playingTeams);

    const groups: string[][] = [];
    for (let i = 0; i + 1 < ordered.length; i += 2) {
      groups.push([...ordered[i], ...ordered[i + 1]]);
    }
    return groups;
  }

  const capacity = courts * 4;
  const ranked = shuffle(playerIds).sort(
    (a, b) => (gamesPlayed.get(a) ?? 0) - (gamesPlayed.get(b) ?? 0)
  );
  const playing = ranked.slice(0, Math.min(capacity, ranked.length));

  const ordered = hasResults
    ? [...playing].sort((a, b) => (points.get(b) ?? 0) - (points.get(a) ?? 0))
    : shuffle(playing);

  const partnerCount = new Map<string, number>();
  for (const round of history) {
    for (const m of round.matches) {
      const k1 = pairKey(m.team1Player1Id, m.team1Player2Id);
      const k2 = pairKey(m.team2Player1Id, m.team2Player2Id);
      partnerCount.set(k1, (partnerCount.get(k1) ?? 0) + 1);
      partnerCount.set(k2, (partnerCount.get(k2) ?? 0) + 1);
    }
  }

  const groups: string[][] = [];
  for (let i = 0; i + 4 <= ordered.length; i += 4) {
    const [rank1, rank2, rank3, rank4] = ordered.slice(i, i + 4);
    const splits = mexicanoBlockSplits(rank1, rank2, rank3, rank4);
    const best = splits.reduce((a, b) => {
      const penaltyA = (partnerCount.get(pairKey(...a.team1)) ?? 0) + (partnerCount.get(pairKey(...a.team2)) ?? 0);
      const penaltyB = (partnerCount.get(pairKey(...b.team1)) ?? 0) + (partnerCount.get(pairKey(...b.team2)) ?? 0);
      return penaltyB < penaltyA ? b : a;
    });
    groups.push([...best.team1, ...best.team2]);
  }
  return groups;
}

export async function generateNextRound(sessionId: string) {
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    include: {
      players: { where: { active: true }, include: { player: true } },
      rounds: { include: { matches: true }, orderBy: { roundNumber: "asc" } },
      fixedPartnerships: true,
    },
  });

  const playerIds = session.players.map((sp) => sp.playerId);
  const activePlayerIds = new Set(playerIds);
  // A partnership survives only while both partners are still active — one
  // partner being removed mid-session breaks the team, so it simply stops
  // being scheduled rather than playing shorthanded.
  const fixedPartnerships: [string, string][] = session.fixedPartners
    ? session.fixedPartnerships
        .filter((p) => activePlayerIds.has(p.player1Id) && activePlayerIds.has(p.player2Id))
        .map((p) => [p.player1Id, p.player2Id])
    : [];

  // The rotation functions only care about "how much did this team score" as
  // an opaque ranking/anti-repeat signal — in SET mode that's games won
  // rather than raw points, so swap the source field here rather than
  // teaching rotation logic about scoring modes.
  const history: HistoryRound[] = session.rounds.map((round) => ({
    roundNumber: round.roundNumber,
    matches: round.matches.map((m) => ({
      team1Player1Id: m.team1Player1Id,
      team1Player2Id: m.team1Player2Id,
      team2Player1Id: m.team2Player1Id,
      team2Player2Id: m.team2Player2Id,
      team1Score: session.scoringMode === "SET" ? m.team1Games : m.team1Score,
      team2Score: session.scoringMode === "SET" ? m.team2Games : m.team2Score,
      completed: m.completed,
    })),
  }));

  let groups: string[][];
  if (session.fixedPartners) {
    groups =
      session.sessionType === "MEXICANO"
        ? planNextMexicanoRound(playerIds, session.courts, history, fixedPartnerships)
        : planNextFixedPartnerRound(session.courts, history, fixedPartnerships);
  } else {
    groups =
      session.sessionType === "MEXICANO"
        ? planNextMexicanoRound(playerIds, session.courts, history, [])
        : planNextRound(playerIds, session.courts, history);
  }

  const nextRoundNumber = (session.rounds.at(-1)?.roundNumber ?? 0) + 1;

  return prisma.round.create({
    data: {
      sessionId,
      roundNumber: nextRoundNumber,
      matches: {
        create: groups.map(([a, b, c, d], idx) => ({
          courtNumber: idx + 1,
          team1Player1Id: a,
          team1Player2Id: b,
          team2Player1Id: c,
          team2Player2Id: d,
        })),
      },
    },
    include: { matches: true },
  });
}

// Auto-generates the standard round-robin length (players - 1) so everyone
// partners with everyone once, matching how Americano/AYO seed a session.
// Sit-outs within each round are still balanced by the rotation algorithm
// when there aren't enough courts for everyone to play every round.
//
// Mexicano is excluded from this eager seeding: its pairing is rank-based on
// cumulative points, so generating rounds 2+ before any result exists just
// ranks everyone on zero. Only round 1 is seeded here; later rounds come from
// the incremental generator once results start coming in.
export async function generateInitialRounds(sessionId: string, playerCount: number) {
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    select: { sessionType: true },
  });
  const initialRounds = session.sessionType === "MEXICANO" ? 1 : playerCount - 1;
  for (let i = 0; i < initialRounds; i++) {
    await generateNextRound(sessionId);
  }
}

function isUnstarted(m: {
  completed: boolean;
  team1Score: number;
  team2Score: number;
  team1Games: number;
  team2Games: number;
  team1GamePoints: number;
  team2GamePoints: number;
}) {
  return (
    !m.completed &&
    m.team1Score === 0 &&
    m.team2Score === 0 &&
    m.team1Games === 0 &&
    m.team2Games === 0 &&
    m.team1GamePoints === 0 &&
    m.team2GamePoints === 0
  );
}

/**
 * Deletes the trailing run of rounds that haven't started yet and
 * regenerates the same number of rounds from scratch. Used after editing a
 * match's roster (e.g. swapping in a substitute), since that changes the
 * games-played/partner history that fairness is based on — any not-yet-played
 * rounds after the edit were built on stale assumptions and need reshuffling.
 * Rounds already in progress or finished are left untouched.
 */
export async function rebalanceUpcomingRounds(sessionId: string) {
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    include: {
      rounds: { include: { matches: true }, orderBy: { roundNumber: "asc" } },
    },
  });

  let cutoff = session.rounds.length;
  for (let i = session.rounds.length - 1; i >= 0; i--) {
    if (session.rounds[i].matches.every(isUnstarted)) {
      cutoff = i;
    } else {
      break;
    }
  }

  const toRegenerate = session.rounds.slice(cutoff);
  if (toRegenerate.length === 0) {
    return { regenerated: 0 };
  }

  await prisma.round.deleteMany({ where: { id: { in: toRegenerate.map((r) => r.id) } } });

  // Mexicano's pairing depends on real results, so only the immediate next
  // round is safe to regenerate blind — regenerating several trailing
  // rounds in one batch would rank rounds 2+ on stale/zero data, the same
  // defect fixed in generateInitialRounds. The rest come back one at a time
  // through the normal completion-triggered flow as those rounds are
  // played. Americano's round-robin doesn't need results to plan ahead, so
  // it keeps regenerating the full trailing run.
  const regenerateCount = session.sessionType === "MEXICANO" ? 1 : toRegenerate.length;

  for (let i = 0; i < regenerateCount; i++) {
    await generateNextRound(sessionId);
  }

  return { regenerated: regenerateCount };
}
