import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      players: { include: { player: true } },
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
