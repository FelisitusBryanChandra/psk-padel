import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nextServeState } from "@/lib/serve";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { team, delta } = (await req.json()) as { team: 1 | 2; delta: 1 | -1 };

  if ((team !== 1 && team !== 2) || (delta !== 1 && delta !== -1)) {
    return NextResponse.json({ error: "Invalid team or delta" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({
    where: { id },
    include: { round: { include: { session: true } } },
  });

  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.completed) {
    return NextResponse.json({ error: "Match already finished" }, { status: 400 });
  }

  const scoreField = team === 1 ? "team1Score" : "team2Score";
  if (match[scoreField] + delta < 0) {
    return NextResponse.json(match);
  }

  // Atomic increment first so a concurrent tap from a second device never
  // loses a point, even if the serve calculation below races slightly.
  const updated = await prisma.match.update({
    where: { id },
    data: { [scoreField]: { increment: delta } },
  });

  const newTotal = updated.team1Score + updated.team2Score;
  const prevTotal = newTotal - delta;
  const serve = nextServeState(updated, prevTotal, newTotal, match.round.session.pointsPerServe);

  const final = await prisma.match.update({ where: { id }, data: serve });

  return NextResponse.json(final);
}
