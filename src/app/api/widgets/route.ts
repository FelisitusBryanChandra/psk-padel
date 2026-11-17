import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, communityFilter, verifySessionToken } from "@/lib/auth";
import { computeCommunityStats } from "@/lib/communityStats";
import { prisma } from "@/lib/prisma";
import { courtLabel } from "@/lib/types";

export type NailBiter = {
  sessionId: string;
  sessionName: string;
  date: string;
  court: string;
  team1: [string, string];
  team2: [string, string];
  score1: number;
  score2: number;
};

export type WidgetsPayload = {
  king: { name: string; wins: number }[];
  nailBiter: NailBiter | null;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Home widget data: this month's win race and the closest finished match of the last 7 days.
export async function GET(req: NextRequest) {
  const auth = await verifySessionToken(req.cookies.get(AUTH_COOKIE)?.value);

  const [stats, matches] = await Promise.all([
    computeCommunityStats(auth),
    prisma.match.findMany({
      where: {
        completed: true,
        round: { session: { ...communityFilter(auth), date: { gte: new Date(Date.now() - WEEK_MS) } } },
      },
      include: {
        team1Player1: { select: { name: true } },
        team1Player2: { select: { name: true } },
        team2Player1: { select: { name: true } },
        team2Player2: { select: { name: true } },
        round: { include: { session: true } },
      },
    }),
  ]);

  let nailBiter: NailBiter | null = null;
  let best: { diff: number; total: number } | null = null;
  for (const m of matches) {
    const s = m.round.session;
    const [a, b] = s.scoringMode === "SET" ? [m.team1Games, m.team2Games] : [m.team1Score, m.team2Score];
    // Skip matches closed without a result (0–0) and draws.
    if (a === b) continue;
    const diff = Math.abs(a - b);
    const total = a + b;
    if (best && (diff > best.diff || (diff === best.diff && total <= best.total))) continue;
    best = { diff, total };
    nailBiter = {
      sessionId: s.id,
      sessionName: s.name,
      date: s.date.toISOString(),
      court: courtLabel(s, m.courtNumber),
      team1: [m.team1Player1.name, m.team1Player2.name],
      team2: [m.team2Player1.name, m.team2Player2.name],
      score1: a,
      score2: b,
    };
  }

  const payload: WidgetsPayload = {
    king: stats.topThreeThisMonth.map((e) => ({ name: e.name, wins: e.wins })),
    nailBiter,
  };
  return NextResponse.json(payload);
}
