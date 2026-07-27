import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findOrCreatePlayer } from "@/lib/player";

const bodySchema = z.object({ newName: z.string().trim().min(1).max(80) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  const { id: sessionId, playerId } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const cleanName = parsed.data.newName;

  await prisma.$transaction(async (tx) => {
    const newPlayer = await findOrCreatePlayer(tx, cleanName);

    const notStarted = { completed: false, team1Score: 0, team2Score: 0 };
    for (const field of [
      "team1Player1Id",
      "team1Player2Id",
      "team2Player1Id",
      "team2Player2Id",
    ] as const) {
      await tx.match.updateMany({
        where: { round: { sessionId }, [field]: playerId, ...notStarted },
        data: { [field]: newPlayer.id },
      });
    }

    await tx.sessionPlayer.deleteMany({ where: { sessionId, playerId } });
    await tx.sessionPlayer.upsert({
      where: { sessionId_playerId: { sessionId, playerId: newPlayer.id } },
      create: { sessionId, playerId: newPlayer.id },
      update: {},
    });
  });

  return NextResponse.json({ ok: true });
}
