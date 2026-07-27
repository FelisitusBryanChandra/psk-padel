import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const serveSchema = {
  servingTeam: z.union([z.literal(1), z.literal(2)]),
  team1ServerSlot: z.union([z.literal(1), z.literal(2)]),
  team2ServerSlot: z.union([z.literal(1), z.literal(2)]),
};

const pointsBodySchema = z.object({
  team1Score: z.number().int().min(0).max(999),
  team2Score: z.number().int().min(0).max(999),
  ...serveSchema,
});

const setBodySchema = z.object({
  team1Games: z.number().int().min(0).max(99),
  team2Games: z.number().int().min(0).max(99),
  team1GamePoints: z.number().int().min(0).max(99),
  team2GamePoints: z.number().int().min(0).max(99),
  ...serveSchema,
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: { round: { include: { session: true } } },
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.completed) {
    return NextResponse.json({ error: "Match already finished" }, { status: 400 });
  }

  const isSetMode = match.round.session.scoringMode === "SET";
  const parsed = isSetMode
    ? setBodySchema.safeParse(await req.json())
    : pointsBodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid scores" }, { status: 400 });
  }

  const updated = await prisma.match.update({ where: { id }, data: parsed.data });

  return NextResponse.json(updated);
}
