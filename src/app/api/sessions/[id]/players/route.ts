import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findOrCreatePlayer } from "@/lib/player";
import { assertRegistrationOpen } from "@/lib/session";

const bodySchema = z.object({ name: z.string().trim().min(1).max(80) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const cleanName = parsed.data.name;

  const { error } = await assertRegistrationOpen(sessionId);
  if (error) return error;

  await prisma.$transaction(async (tx) => {
    const player = await findOrCreatePlayer(tx, cleanName);
    await tx.sessionPlayer.upsert({
      where: { sessionId_playerId: { sessionId, playerId: player.id } },
      create: { sessionId, playerId: player.id },
      update: {},
    });
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
