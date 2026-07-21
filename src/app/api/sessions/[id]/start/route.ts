import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInitialRounds } from "@/lib/rotation";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id },
    include: { players: true, rounds: true },
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

  await generateInitialRounds(id, session.players.length);
  return NextResponse.json({ ok: true }, { status: 201 });
}
