import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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
    include: { rounds: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.rounds.length > 0) {
    return NextResponse.json({ error: "Registration is closed — the session already started" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    let player = await tx.player.findFirst({ where: { name: cleanName } });
    if (!player) {
      player = await tx.player.create({ data: { name: cleanName } });
    }
    await tx.sessionPlayer.upsert({
      where: { sessionId_playerId: { sessionId, playerId: player.id } },
      create: { sessionId, playerId: player.id },
      update: {},
    });
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
