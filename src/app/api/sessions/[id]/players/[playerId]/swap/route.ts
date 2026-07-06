import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  const { id: sessionId, playerId } = await params;
  const { newName } = (await req.json()) as { newName: string };

  const cleanName = newName?.trim();
  if (!cleanName) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    let newPlayer = await tx.player.findFirst({ where: { name: cleanName } });
    if (!newPlayer) {
      newPlayer = await tx.player.create({ data: { name: cleanName } });
    }

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
