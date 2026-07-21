import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const SLOTS = ["team1Player1", "team1Player2", "team2Player1", "team2Player2"] as const;

const bodySchema = z.object({
  slot: z.enum(SLOTS),
  playerId: z.string().min(1),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
  }
  const { slot, playerId } = parsed.data;

  const match = await prisma.match.findUnique({
    where: { id },
    include: { round: { include: { session: true } } },
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const otherSlots = SLOTS.filter((s) => s !== slot);
  if (otherSlots.some((s) => match[`${s}Id`] === playerId)) {
    return NextResponse.json(
      { error: "Player is already in this match" },
      { status: 400 }
    );
  }

  const inRoster = await prisma.sessionPlayer.findUnique({
    where: {
      sessionId_playerId: { sessionId: match.round.sessionId, playerId },
    },
  });
  if (!inRoster) {
    return NextResponse.json({ error: "Player is not in this session" }, { status: 400 });
  }

  const updated = await prisma.match.update({
    where: { id },
    data: { [`${slot}Id`]: playerId },
  });

  return NextResponse.json(updated);
}
