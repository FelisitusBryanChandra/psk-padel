import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Backs the no-login "share matches" link -- read-only, no admin actions
// possible from this data (no player roster mutation, no score editing), so
// it's safe to expose full match/round detail here unlike the registration
// endpoint.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id },
    select: {
      name: true,
      venueName: true,
      courtNames: true,
      scoringMode: true,
      pointsPerMatch: true,
      gamesPerSet: true,
      rounds: {
        orderBy: { roundNumber: "asc" },
        select: {
          id: true,
          roundNumber: true,
          matches: {
            select: {
              id: true,
              courtNumber: true,
              team1Player1: { select: { id: true, name: true } },
              team1Player2: { select: { id: true, name: true } },
              team2Player1: { select: { id: true, name: true } },
              team2Player2: { select: { id: true, name: true } },
              team1Score: true,
              team2Score: true,
              team1Games: true,
              team2Games: true,
              completed: true,
              servingTeam: true,
              team1ServerSlot: true,
              team2ServerSlot: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}
