import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Player rosters are only editable while the session hasn't started yet. */
export async function assertRegistrationOpen(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { rounds: true },
  });
  if (!session) {
    return { error: NextResponse.json({ error: "Session not found" }, { status: 404 }) };
  }
  if (session.rounds.length > 0) {
    return {
      error: NextResponse.json(
        { error: "Registration is closed — the session already started" },
        { status: 400 }
      ),
    };
  }
  return { error: null };
}
