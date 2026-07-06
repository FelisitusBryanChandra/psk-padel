import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id },
    include: { rounds: { include: { matches: true } } },
  });

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  for (const round of session.rounds) {
    for (const m of round.matches) {
      if (m.completed) continue;

      if (m.team1Score === 0 && m.team2Score === 0) {
        // Never actually played — drop it rather than count a fake 0-0.
        await prisma.match.delete({ where: { id: m.id } });
      } else {
        // Ran out of time mid-match — lock in whatever the score was.
        await prisma.match.update({ where: { id: m.id }, data: { completed: true } });
      }
    }
  }

  // Clean up any round that's left with no matches at all.
  await prisma.round.deleteMany({
    where: { sessionId: id, matches: { none: {} } },
  });

  return NextResponse.json({ ok: true });
}
