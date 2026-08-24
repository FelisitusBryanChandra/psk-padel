import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInitialRounds } from "@/lib/rotation";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      players: { where: { active: true } },
      rounds: true,
      fixedPartnerships: true,
    },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.rounds.length > 0) {
    return NextResponse.json({ error: "Session already started" }, { status: 400 });
  }
  if (session.players.length < 4) {
    return NextResponse.json({ error: "Need at least 4 players to start" }, { status: 400 });
  }

  if (session.fixedPartners) {
    const rosterIds = session.players.map((sp) => sp.playerId);
    const pairedIds = session.fixedPartnerships.flatMap((p) => [p.player1Id, p.player2Id]);
    const allPaired =
      pairedIds.length === rosterIds.length && rosterIds.every((pid) => pairedIds.includes(pid));
    if (!allPaired) {
      return NextResponse.json(
        { error: "Assign every registered player to a team before starting" },
        { status: 400 }
      );
    }
  }

  await generateInitialRounds(id, session.players.length);
  return NextResponse.json({ ok: true }, { status: 201 });
}
