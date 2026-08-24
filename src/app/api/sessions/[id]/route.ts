import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({ courts: z.number().int().min(1).max(20) });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      players: { where: { active: true }, include: { player: true } },
      rounds: {
        orderBy: { roundNumber: "asc" },
        include: {
          matches: {
            include: {
              team1Player1: true,
              team1Player2: true,
              team2Player1: true,
              team2Player2: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.session.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!session.dynamicCourts) {
    return NextResponse.json({ error: "Session does not have dynamic courts enabled" }, { status: 400 });
  }

  const updated = await prisma.session.update({
    where: { id },
    data: { courts: parsed.data.courts },
  });
  return NextResponse.json(updated);
}
