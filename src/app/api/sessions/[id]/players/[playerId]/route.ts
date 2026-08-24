import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rebalanceUpcomingRounds } from "@/lib/rotation";
import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  const auth = await verifySessionToken(req.cookies.get(AUTH_COOKIE)?.value);
  if (auth?.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can remove a player" }, { status: 403 });
  }

  const { id: sessionId, playerId } = await params;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { rounds: { select: { id: true } } },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.rounds.length === 0) {
    // Nothing has been played yet — just drop them from the roster.
    await prisma.sessionPlayer.deleteMany({ where: { sessionId, playerId } });
    return NextResponse.json({ ok: true });
  }

  // Mid-session: soft-remove so their already-played matches and earned
  // points stay on the standings table, then reshuffle the not-yet-started
  // rounds without them.
  await prisma.sessionPlayer.updateMany({ where: { sessionId, playerId }, data: { active: false } });
  await rebalanceUpcomingRounds(sessionId);

  return NextResponse.json({ ok: true });
}
