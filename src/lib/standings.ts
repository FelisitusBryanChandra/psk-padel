import { prisma } from "@/lib/prisma";

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

export async function computeStandings(sessionId: string): Promise<StandingRow[]> {
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    include: {
      players: { include: { player: true } },
      rounds: { include: { matches: true } },
    },
  });

  const rows = new Map<string, StandingRow>();
  for (const sp of session.players) {
    rows.set(sp.playerId, {
      playerId: sp.playerId,
      name: sp.player.name,
      played: 0,
      wins: 0,
      ties: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      sd: 0,
      missedRounds: 0,
      mBonus: 0,
      score: 0,
    });
  }

  const totalRounds = session.rounds.length;

  for (const round of session.rounds) {
    for (const m of round.matches) {
      const team1 = [m.team1Player1Id, m.team1Player2Id];
      const team2 = [m.team2Player1Id, m.team2Player2Id];

      for (const id of [...team1, ...team2]) {
        const row = rows.get(id);
        if (row) row.played += 1;
      }

      if (!m.completed) continue;

      const applyTeam = (ids: string[], ownScore: number, oppScore: number) => {
        for (const id of ids) {
          const row = rows.get(id);
          if (!row) continue;
          row.pointsFor += ownScore;
          row.pointsAgainst += oppScore;
          if (ownScore > oppScore) row.wins += 1;
          else if (ownScore < oppScore) row.losses += 1;
          else row.ties += 1;
        }
      };

      applyTeam(team1, m.team1Score, m.team2Score);
      applyTeam(team2, m.team2Score, m.team1Score);
    }
  }

  for (const row of rows.values()) {
    row.missedRounds = totalRounds - row.played;
    row.mBonus = row.missedRounds * 10;
    row.sd = row.pointsFor - row.pointsAgainst;
    row.score = row.pointsFor;
  }

  return Array.from(rows.values());
}

export function sortStandings(rows: StandingRow[], by: "sd" | "score"): StandingRow[] {
  return [...rows].sort((a, b) => {
    const primary = by === "sd" ? b.sd - a.sd : b.score - a.score;
    if (primary !== 0) return primary;
    return b.score - a.score || b.wins - a.wins;
  });
}
