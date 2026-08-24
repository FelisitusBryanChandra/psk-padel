import { prisma } from "@/lib/prisma";
import { communityFilter, type AuthPayload } from "@/lib/auth";

export type CommunityStats = {
  communityName: string;
  totalSessions: number;
  totalGamesPlayed: number;
  monthGamesPlayed: number;
  topPlayerThisMonth: { name: string; points: number } | null;
};

export async function computeCommunityStats(auth: AuthPayload | null): Promise<CommunityStats> {
  const communityName =
    auth?.role === "admin"
      ? "All Communities"
      : auth?.communityId
        ? ((await prisma.community.findUnique({ where: { id: auth.communityId }, select: { name: true } }))
            ?.name ?? "Unknown Community")
        : "No Community";

  const sessions = await prisma.session.findMany({
    where: communityFilter(auth),
    include: {
      rounds: {
        include: {
          matches: {
            include: { team1Player1: true, team1Player2: true, team2Player1: true, team2Player2: true },
          },
        },
      },
    },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let totalGamesPlayed = 0;
  let monthGamesPlayed = 0;
  const monthPoints = new Map<string, { name: string; points: number }>();

  for (const session of sessions) {
    const isThisMonth = session.date >= monthStart;
    for (const round of session.rounds) {
      for (const m of round.matches) {
        if (!m.completed) continue;
        totalGamesPlayed += 1;
        if (!isThisMonth) continue;
        monthGamesPlayed += 1;

        const [team1Total, team2Total] =
          session.scoringMode === "SET" ? [m.team1Games, m.team2Games] : [m.team1Score, m.team2Score];
        const addPoints = (id: string, name: string, points: number) => {
          const entry = monthPoints.get(id) ?? { name, points: 0 };
          entry.points += points;
          monthPoints.set(id, entry);
        };
        addPoints(m.team1Player1Id, m.team1Player1.name, team1Total);
        addPoints(m.team1Player2Id, m.team1Player2.name, team1Total);
        addPoints(m.team2Player1Id, m.team2Player1.name, team2Total);
        addPoints(m.team2Player2Id, m.team2Player2.name, team2Total);
      }
    }
  }

  const topPlayerThisMonth = Array.from(monthPoints.values()).sort((a, b) => b.points - a.points)[0] ?? null;

  return {
    communityName,
    totalSessions: sessions.length,
    totalGamesPlayed,
    monthGamesPlayed,
    topPlayerThisMonth,
  };
}
