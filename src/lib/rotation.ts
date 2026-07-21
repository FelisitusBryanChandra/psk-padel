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
  }[];
};

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
  const gamesPlayed = new Map<string, number>(playerIds.map((id) => [id, 0]));
  const partnerCount = new Map<string, number>();

  for (const round of history) {
    for (const m of round.matches) {
      const slots = [m.team1Player1Id, m.team1Player2Id, m.team2Player1Id, m.team2Player2Id];
      for (const id of slots) {
        gamesPlayed.set(id, (gamesPlayed.get(id) ?? 0) + 1);
      }
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

export async function generateNextRound(sessionId: string) {
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    include: {
      players: { include: { player: true } },
      rounds: { include: { matches: true }, orderBy: { roundNumber: "asc" } },
    },
  });

  const playerIds = session.players.map((sp) => sp.playerId);
  const groups = planNextRound(playerIds, session.courts, session.rounds);

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
export async function generateInitialRounds(sessionId: string, playerCount: number) {
  const initialRounds = playerCount - 1;
  for (let i = 0; i < initialRounds; i++) {
    await generateNextRound(sessionId);
  }
}

function isUnstarted(m: { completed: boolean; team1Score: number; team2Score: number }) {
  return !m.completed && m.team1Score === 0 && m.team2Score === 0;
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

  for (let i = 0; i < toRegenerate.length; i++) {
    await generateNextRound(sessionId);
  }

  return { regenerated: toRegenerate.length };
}
