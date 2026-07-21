import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  team1Score: z.number().int().min(0).max(999),
  team2Score: z.number().int().min(0).max(999),
  servingTeam: z.union([z.literal(1), z.literal(2)]),
  team1ServerSlot: z.union([z.literal(1), z.literal(2)]),
  team2ServerSlot: z.union([z.literal(1), z.literal(2)]),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid scores" }, { status: 400 });
  }
  const { team1Score, team2Score, servingTeam, team1ServerSlot, team2ServerSlot } = parsed.data;

  const match = await prisma.match.findUnique({ where: { id } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.completed) {
    return NextResponse.json({ error: "Match already finished" }, { status: 400 });
  }

  const updated = await prisma.match.update({
    where: { id },
    data: { team1Score, team2Score, servingTeam, team1ServerSlot, team2ServerSlot },
  });

  return NextResponse.json(updated);
}
