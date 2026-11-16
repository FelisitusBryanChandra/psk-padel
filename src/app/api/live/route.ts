import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, communityFilter, verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { courtLabel } from "@/lib/types";

// Matches older than this are treated as forgotten, not live.
const RECENT_MS = 36 * 60 * 60 * 1000;

// Courts that are actually being played right now, for the nav's live
// island: unfinished matches with a score on the board, in recent sessions.
export async function GET(req: NextRequest) {
  const auth = await verifySessionToken(req.cookies.get(AUTH_COOKIE)?.value);

  const sessions = await prisma.session.findMany({
    where: { ...communityFilter(auth), date: { gte: new Date(Date.now() - RECENT_MS) } },
    orderBy: { date: "desc" },
    select: {
      id: true,
      name: true,
      scoringMode: true,
      courtNames: true,
      rounds: {
        orderBy: { roundNumber: "asc" },
        select: {
          matches: {
            where: { completed: false },
            orderBy: { courtNumber: "asc" },
            select: {
              id: true,
              courtNumber: true,
              team1Score: true,
              team2Score: true,
              team1Games: true,
              team2Games: true,
            },
          },
        },
      },
    },
  });

  const courts = sessions.flatMap((s) => {
    const setMode = s.scoringMode === "SET";
    return s.rounds
      .flatMap((r) => r.matches)
      .map((m) => ({
        sessionId: s.id,
        sessionName: s.name,
        matchId: m.id,
        court: courtLabel(s, m.courtNumber),
        team1: setMode ? m.team1Games : m.team1Score,
        team2: setMode ? m.team2Games : m.team2Score,
      }))
      .filter((c) => c.team1 + c.team2 > 0);
  });

  return NextResponse.json(courts);
}
