import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findOrCreatePlayer } from "@/lib/player";
import { isRegistrationExpired } from "@/lib/registration";

const bodySchema = z.object({ name: z.string().trim().min(1).max(80) });

// The no-login counterpart of POST /api/sessions/[id]/players — an
// anonymous caller can never be admin, so there's no bypass here: once the
// session has started or its registration window has closed, this always
// rejects (the admin still adds players via the logged-in route instead).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const cleanName = parsed.data.name;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { date: true, rounds: { select: { id: true } } },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.rounds.length > 0 || isRegistrationExpired(session.date)) {
    return NextResponse.json(
      { error: "Registration for this session has closed" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const player = await findOrCreatePlayer(tx, cleanName);
    await tx.sessionPlayer.upsert({
      where: { sessionId_playerId: { sessionId, playerId: player.id } },
      create: { sessionId, playerId: player.id },
      update: { active: true },
    });
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
