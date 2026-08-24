import { prisma } from "@/lib/prisma";
import type { StandingRow } from "@/lib/types";

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

  for (const round of session.rounds) {
    for (const m of round.matches) {
      if (!m.completed) continue;

      const team1 = [m.team1Player1Id, m.team1Player2Id];
      const team2 = [m.team2Player1Id, m.team2Player2Id];

      for (const id of [...team1, ...team2]) {
        const row = rows.get(id);
        if (row) row.played += 1;
      }

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

      const [team1Total, team2Total] =
        session.scoringMode === "SET" ? [m.team1Games, m.team2Games] : [m.team1Score, m.team2Score];
      applyTeam(team1, team1Total, team2Total);
      applyTeam(team2, team2Total, team1Total);
    }
  }

  const activePlayerIds = new Set(session.players.filter((sp) => sp.active).map((sp) => sp.playerId));
  const maxPlayed = Math.max(
    0,
    ...Array.from(rows.values())
      .filter((r) => activePlayerIds.has(r.playerId))
      .map((r) => r.played)
  );

  // Tennis Set and Race to Points use different missed-round bonus rates.
  const bonusPerRound = session.scoringMode === "SET" ? 2 : 10;

  for (const row of rows.values()) {
    // Removed players stop accruing the missed-round bonus — their earned
    // points stay on the board, but they no longer count toward "everyone
    // who's still in this session".
    if (activePlayerIds.has(row.playerId)) {
      row.missedRounds = maxPlayed - row.played;
      row.mBonus = row.missedRounds * bonusPerRound;
    }
    row.sd = row.pointsFor - row.pointsAgainst;
    row.score = row.pointsFor + row.mBonus;
  }

  return Array.from(rows.values());
}
