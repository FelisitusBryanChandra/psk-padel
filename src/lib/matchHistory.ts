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

export type MatchHistoryPage = {
  entries: MatchHistoryEntry[];
  hasMore: boolean;
};

export const HISTORY_PAGE_SIZE = 20;

/**
 * Community-wide feed of completed matches, most recent first. There's no
 * per-player identity in this app (auth is community/role scoped, not
 * per-player — see AuthPayload), so this is a shared history, not a
 * personal "my matches" view.
 *
 * Queries Match directly (rather than sessions -> rounds -> matches, which
 * loaded every completed match in the community on every request) so
 * offset/limit are real database-level paging, not a slice of an
 * already-fully-fetched array.
 */
export async function computeMatchHistory(
  auth: AuthPayload | null,
  options: { sessionType?: "AMERICANO" | "MEXICANO"; offset?: number; limit?: number } = {}
): Promise<MatchHistoryPage> {
  const offset = Math.max(0, options.offset ?? 0);
  const limit = Math.max(1, options.limit ?? HISTORY_PAGE_SIZE);

  const matches = await prisma.match.findMany({
    where: {
      completed: true,
      round: {
        session: {
          ...communityFilter(auth),
          ...(options.sessionType ? { sessionType: options.sessionType } : {}),
        },
      },
    },
    include: {
      team1Player1: true,
      team1Player2: true,
      team2Player1: true,
      team2Player2: true,
      round: { include: { session: true } },
    },
    // Most-recent session first, most-recent round within it first; match id
    // as a final tiebreaker so paging stays stable across requests.
    orderBy: [
      { round: { session: { date: "desc" } } },
      { round: { roundNumber: "desc" } },
      { id: "desc" },
    ],
    skip: offset,
    take: limit + 1, // one extra row just to know whether there's a next page
  });

  const hasMore = matches.length > limit;
  const page = matches.slice(0, limit);

  const entries: MatchHistoryEntry[] = page.map((m) => {
    const session = m.round.session;
    const [team1Total, team2Total] =
      session.scoringMode === "SET" ? [m.team1Games, m.team2Games] : [m.team1Score, m.team2Score];
    const target = session.scoringMode === "SET" ? session.gamesPerSet : session.pointsPerMatch;
    return {
      matchId: m.id,
      date: session.date.toISOString(),
      court: courtLabel(session, m.courtNumber),
      sessionName: session.name,
      sessionType: session.sessionType as "AMERICANO" | "MEXICANO",
      team1: [m.team1Player1.name, m.team1Player2.name],
      team2: [m.team2Player1.name, m.team2Player2.name],
      score: `${team1Total}–${team2Total}`,
      title: computeMatchTitle(
        session.scoringMode as "POINTS" | "SET",
        team1Total,
        team2Total,
        target
      ),
    };
  });

  return { entries, hasMore };
}
