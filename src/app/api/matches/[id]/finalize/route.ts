import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const pointsBodySchema = z.object({
  team1Score: z.number().int().min(0).max(999),
  team2Score: z.number().int().min(0).max(999),
});

const setBodySchema = z.object({
  team1Games: z.number().int().min(0).max(99),
  team2Games: z.number().int().min(0).max(99),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: { round: { include: { session: true } } },
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const isSetMode = match.round.session.scoringMode === "SET";
  const parsed = isSetMode
    ? setBodySchema.safeParse(await req.json())
    : pointsBodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid scores" }, { status: 400 });
  }

  const updated = await prisma.match.update({
    where: { id },
    data: isSetMode
      ? { ...parsed.data, team1GamePoints: 0, team2GamePoints: 0, completed: true }
      : { ...parsed.data, completed: true },
  });

  return NextResponse.json(updated);
}
