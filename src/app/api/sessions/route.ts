import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sessions = await prisma.session.findMany({
    orderBy: { date: "desc" },
    include: { players: { include: { player: true } }, rounds: true },
  });

  return NextResponse.json(
    sessions.map((s) => ({
      id: s.id,
      name: s.name,
      date: s.date,
      courts: s.courts,
      pointsPerMatch: s.pointsPerMatch,
      pointsPerServe: s.pointsPerServe,
      playerCount: s.players.length,
      roundCount: s.rounds.length,
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, date, courts, pointsPerMatch, pointsPerServe, playerNames } = body as {
    name: string;
    date: string;
    courts: number;
    pointsPerMatch?: number;
    pointsPerServe?: number;
    playerNames: string[];
  };

  const cleanNames = [...new Set(playerNames.map((n) => n.trim()).filter(Boolean))];

  if (!name || !date || !courts || cleanNames.length < 4) {
    return NextResponse.json(
      { error: "Name, date, courts and at least 4 players are required" },
      { status: 400 }
    );
  }

  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.session.create({
      data: {
        name,
        date: new Date(date),
        courts,
        pointsPerMatch: pointsPerMatch || 21,
        pointsPerServe: pointsPerServe || 5,
      },
    });

    for (const playerName of cleanNames) {
      let player = await tx.player.findFirst({ where: { name: playerName } });
      if (!player) {
        player = await tx.player.create({ data: { name: playerName } });
      }
      await tx.sessionPlayer.create({
        data: { sessionId: created.id, playerId: player.id },
      });
    }

    return created;
  });

  return NextResponse.json(session, { status: 201 });
}
