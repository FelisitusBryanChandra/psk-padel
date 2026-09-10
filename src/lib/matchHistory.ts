import { prisma } from "@/lib/prisma";
import { communityFilter, type AuthPayload } from "@/lib/auth";
import { courtLabel } from "@/lib/types";
import { computeMatchTitle, type MatchTitle } from "@/lib/matchTitle";

export type MatchHistoryEntry = {
  matchId: string;
  date: string;
  court: string;
  sessionName: string;
  sessionType: "AMERICANO" | "MEXICANO";
  team1: [string, string];
  team2: [string, string];
  score: string;
  title: MatchTitle;
};

/**
 * Community-wide feed of completed matches, most recent first. There's no
 * per-player identity in this app (auth is community/role scoped, not
 * per-player — see AuthPayload), so this is a shared history, not a
 * personal "my matches" view.
 */
export async function computeMatchHistory(auth: AuthPayload | null): Promise<MatchHistoryEntry[]> {
  const sessions = await prisma.session.findMany({
    where: communityFilter(auth),
    orderBy: { date: "desc" },
    include: {
      rounds: {
        orderBy: { roundNumber: "desc" },
        include: {
          matches: {
            include: { team1Player1: true, team1Player2: true, team2Player1: true, team2Player2: true },
          },
        },
      },
    },
  });

  const entries: MatchHistoryEntry[] = [];
  for (const session of sessions) {
    for (const round of session.rounds) {
      for (const m of round.matches) {
        if (!m.completed) continue;
        const [team1Total, team2Total] =
          session.scoringMode === "SET" ? [m.team1Games, m.team2Games] : [m.team1Score, m.team2Score];
        const target = session.scoringMode === "SET" ? session.gamesPerSet : session.pointsPerMatch;
        entries.push({
          matchId: m.id,
          date: session.date.toISOString(),
          court: courtLabel(session, m.courtNumber),
          sessionName: session.name,
          sessionType: session.sessionType as "AMERICANO" | "MEXICANO",
          team1: [m.team1Player1.name, m.team1Player2.name],
          team2: [m.team2Player1.name, m.team2Player2.name],
          score: `${team1Total}–${team2Total}`,
          title: computeMatchTitle(session.scoringMode as "POINTS" | "SET", team1Total, team2Total, target),
        });
      }
    }
  }

  return entries;
}
