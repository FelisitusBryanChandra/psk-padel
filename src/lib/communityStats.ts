import { prisma } from "@/lib/prisma";
import { communityFilter, type AuthPayload } from "@/lib/auth";

export type LeaderboardEntry = { playerId: string; name: string; wins: number };
export type DuoEntry = { names: [string, string]; count: number };

export type CommunityStats = {
  communityName: string;
  totalSessions: number;
  totalGamesPlayed: number;
  monthGamesPlayed: number;
  mostWinsThisMonth: LeaderboardEntry | null;
  mostActiveThisMonth: { playerId: string; name: string; gamesPlayed: number } | null;
  favoriteDuoThisMonth: DuoEntry | null;
  topThreeThisMonth: LeaderboardEntry[];
};

function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

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
  const monthWins = new Map<string, LeaderboardEntry>();
  const monthGames = new Map<string, { playerId: string; name: string; gamesPlayed: number }>();
  const monthDuos = new Map<string, DuoEntry>();

  const bumpGames = (id: string, name: string) => {
    const entry = monthGames.get(id) ?? { playerId: id, name, gamesPlayed: 0 };
    entry.gamesPlayed += 1;
    monthGames.set(id, entry);
  };
  const bumpWins = (id: string, name: string) => {
    const entry = monthWins.get(id) ?? { playerId: id, name, wins: 0 };
    entry.wins += 1;
    monthWins.set(id, entry);
  };
  const bumpDuo = (aId: string, aName: string, bId: string, bName: string) => {
    const key = pairKey(aId, bId);
    const entry = monthDuos.get(key) ?? { names: [aName, bName] as [string, string], count: 0 };
    entry.count += 1;
    monthDuos.set(key, entry);
  };

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

        bumpGames(m.team1Player1Id, m.team1Player1.name);
        bumpGames(m.team1Player2Id, m.team1Player2.name);
        bumpGames(m.team2Player1Id, m.team2Player1.name);
        bumpGames(m.team2Player2Id, m.team2Player2.name);

        bumpDuo(m.team1Player1Id, m.team1Player1.name, m.team1Player2Id, m.team1Player2.name);
        bumpDuo(m.team2Player1Id, m.team2Player1.name, m.team2Player2Id, m.team2Player2.name);

        // A win is unit-agnostic (true whether the match was decided by
        // points or games), unlike summing raw scores across sessions with
        // different scoring modes.
        if (team1Total > team2Total) {
          bumpWins(m.team1Player1Id, m.team1Player1.name);
          bumpWins(m.team1Player2Id, m.team1Player2.name);
        } else if (team2Total > team1Total) {
          bumpWins(m.team2Player1Id, m.team2Player1.name);
          bumpWins(m.team2Player2Id, m.team2Player2.name);
        }
      }
    }
  }

  const topThreeThisMonth = Array.from(monthWins.values())
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 3);
  const mostWinsThisMonth = topThreeThisMonth[0] ?? null;
  const mostActiveThisMonth =
    Array.from(monthGames.values()).sort((a, b) => b.gamesPlayed - a.gamesPlayed)[0] ?? null;
  const favoriteDuoThisMonth =
    Array.from(monthDuos.values()).sort((a, b) => b.count - a.count)[0] ?? null;

  return {
    communityName,
    totalSessions: sessions.length,
    totalGamesPlayed,
    monthGamesPlayed,
    mostWinsThisMonth,
    mostActiveThisMonth,
    favoriteDuoThisMonth,
    topThreeThisMonth,
  };
}
