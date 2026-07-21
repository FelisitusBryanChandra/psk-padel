import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInitialRounds } from "@/lib/rotation";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  date: z.string().min(1),
  courtName: z.string().trim().max(120).optional(),
  courts: z.number().int().min(1).max(20),
  dynamicCourts: z.boolean().optional(),
  pointsPerMatch: z.number().int().min(1).max(999).optional(),
  pointsPerServe: z.number().int().min(1).max(999).optional(),
  playerNames: z.array(z.string().max(80)).max(64),
});

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
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { name, date, courtName, courts, dynamicCourts, pointsPerMatch, pointsPerServe, playerNames } =
    parsed.data;

  const cleanNames = [...new Set(playerNames.map((n) => n.trim()).filter(Boolean))];

  const auth = await verifySessionToken(req.cookies.get(AUTH_COOKIE)?.value);

  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.session.create({
      data: {
        name,
        date: new Date(date),
        courtName,
        courts,
        dynamicCourts: dynamicCourts ?? false,
        pointsPerMatch: pointsPerMatch || 21,
        pointsPerServe: pointsPerServe || 5,
        communityId: auth?.role === "member" ? auth.communityId : undefined,
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

  // Fewer than 4 players means registration is still open (see
  // /session/[id]/register) — rounds get generated later via "Start Session".
  if (cleanNames.length >= 4) {
    await generateInitialRounds(session.id, cleanNames.length);
  }

  return NextResponse.json(session, { status: 201 });
}
