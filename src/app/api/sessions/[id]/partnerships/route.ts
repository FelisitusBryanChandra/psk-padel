import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth";

const bodySchema = z.object({
  partnerships: z.array(z.tuple([z.string(), z.string()])),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifySessionToken(req.cookies.get(AUTH_COOKIE)?.value);
  if (auth?.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can assign teams" }, { status: 403 });
  }

  const { id: sessionId } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid partnerships" }, { status: 400 });
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { players: { where: { active: true } }, rounds: { select: { id: true } } },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!session.fixedPartners) {
    return NextResponse.json({ error: "This session doesn't use fixed partners" }, { status: 400 });
  }
  if (session.rounds.length > 0) {
    return NextResponse.json({ error: "Teams are locked once the session has started" }, { status: 400 });
  }

  const rosterIds = session.players.map((sp) => sp.playerId);
  const pairedIds = parsed.data.partnerships.flat();
  const allPairedOnce =
    pairedIds.length === rosterIds.length &&
    new Set(pairedIds).size === rosterIds.length &&
    rosterIds.every((id) => pairedIds.includes(id));
  if (!allPairedOnce) {
    return NextResponse.json(
      { error: "Every registered player must be paired into exactly one team" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.fixedPartnership.deleteMany({ where: { sessionId } });
    for (const [player1Id, player2Id] of parsed.data.partnerships) {
      await tx.fixedPartnership.create({ data: { sessionId, player1Id, player2Id } });
    }
  });

  return NextResponse.json({ ok: true });
}
