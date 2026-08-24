import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Backs the no-login registration link — deliberately returns only what
// that page needs (name, date, roster, whether it's started) and never
// scores or match details, since this endpoint has no auth wall at all.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id },
    select: {
      name: true,
      date: true,
      rounds: { select: { id: true } },
      players: {
        where: { active: true },
        select: { player: { select: { id: true, name: true } } },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}
