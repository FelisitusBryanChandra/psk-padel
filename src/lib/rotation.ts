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
 * Builds the next round for a session: picks who sits out (least-played
 * first), then partitions the rest into disjoint groups of 4 (one per
 * court), preferring pairings that haven't partnered before.
 */
export async function generateNextRound(sessionId: string) {
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    include: {
      players: { include: { player: true } },
      rounds: { include: { matches: true }, orderBy: { roundNumber: "asc" } },
    },
  });

  const playerIds = session.players.map((sp) => sp.playerId);
  const gamesPlayed = new Map<string, number>(playerIds.map((id) => [id, 0]));
  const partnerCount = new Map<string, number>();

  for (const round of session.rounds) {
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

  const capacity = session.courts * 4;
  const ranked = shuffle(playerIds).sort(
    (a, b) => (gamesPlayed.get(a) ?? 0) - (gamesPlayed.get(b) ?? 0)
  );
  const playing = ranked.slice(0, Math.min(capacity, ranked.length));

  // Build groups of 4, greedily minimizing repeat partnerships.
  const pool = shuffle(playing);
  const groups: string[][] = [];
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

    groups.push([p1, p2, p3, p4]);
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
