import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNextRound } from "@/lib/rotation";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Mexicano's pairing depends on the previous round's real results, so a
  // premature "Add More Matches" tap mid-round would rank everyone on
  // whatever's been scored so far — reject it until that round is done.
  const session = await prisma.session.findUnique({
    where: { id },
    select: {
      sessionType: true,
      rounds: {
        orderBy: { roundNumber: "desc" },
        take: 1,
        select: { matches: { select: { completed: true } } },
      },
    },
  });
  if (session?.sessionType === "MEXICANO" && session.rounds[0]?.matches.some((m) => !m.completed)) {
    return NextResponse.json(
      { error: "Finish the current round before adding more matches" },
      { status: 400 }
    );
  }

  try {
    const round = await generateNextRound(id);
    return NextResponse.json(round, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not generate round" }, { status: 400 });
  }
}
