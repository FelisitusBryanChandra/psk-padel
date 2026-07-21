import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  const { id: sessionId, playerId } = await params;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { rounds: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.rounds.length > 0) {
    return NextResponse.json({ error: "Registration is closed — the session already started" }, { status: 400 });
  }

  await prisma.sessionPlayer.deleteMany({ where: { sessionId, playerId } });
  return NextResponse.json({ ok: true });
}
