import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertRegistrationOpen } from "@/lib/session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  const { id: sessionId, playerId } = await params;

  const { error } = await assertRegistrationOpen(sessionId);
  if (error) return error;

  await prisma.sessionPlayer.deleteMany({ where: { sessionId, playerId } });
  return NextResponse.json({ ok: true });
}
