import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { nextServeState } from "@/lib/serve";

const bodySchema = z
  .object({
    team: z.union([z.literal(1), z.literal(2)]),
    delta: z.union([z.literal(1), z.literal(-1)]).optional(),
    value: z.number().int().min(0).max(999).optional(),
  })
  .refine((d) => d.delta !== undefined || d.value !== undefined, {
    message: "Provide delta or value",
  });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { team, delta, value } = parsed.data;

  const match = await prisma.match.findUnique({
    where: { id },
    include: { round: { include: { session: true } } },
  });

  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.completed) {
    return NextResponse.json({ error: "Match already finished" }, { status: 400 });
  }

  const scoreField = team === 1 ? "team1Score" : "team2Score";
  const prevValue = match[scoreField];

  let updated;
  if (value !== undefined) {
    updated = await prisma.match.update({ where: { id }, data: { [scoreField]: value } });
  } else {
    if (prevValue + delta! < 0) {
      return NextResponse.json(match);
    }
    // Atomic increment so a concurrent tap from a second device never loses
    // a point, even if the serve calculation below races slightly.
    updated = await prisma.match.update({
      where: { id },
      data: { [scoreField]: { increment: delta } },
    });
  }

  const appliedChange = updated[scoreField] - prevValue;
  const newTotal = updated.team1Score + updated.team2Score;
  const prevTotal = newTotal - appliedChange;
  const serve = nextServeState(updated, prevTotal, newTotal, match.round.session.pointsPerServe);

  const final = await prisma.match.update({ where: { id }, data: serve });

  return NextResponse.json(final);
}
