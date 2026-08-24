import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findOrCreatePlayer } from "@/lib/player";
import { rebalanceUpcomingRounds } from "@/lib/rotation";
import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth";
import { isRegistrationExpired } from "@/lib/registration";

const bodySchema = z.object({ name: z.string().trim().min(1).max(80) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const cleanName = parsed.data.name;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { rounds: { select: { id: true } } },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const auth = await verifySessionToken(req.cookies.get(AUTH_COOKIE)?.value);
  const registrationClosed = session.rounds.length > 0 || isRegistrationExpired(session.date);
  if (auth?.role !== "admin" && registrationClosed) {
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

  // Joining mid-session: reshuffle the not-yet-started rounds so the new
  // player actually gets folded into the rotation instead of waiting for
  // the next session.
  if (session.rounds.length > 0) {
    await rebalanceUpcomingRounds(sessionId);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
