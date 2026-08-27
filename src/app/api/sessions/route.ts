import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE, communityFilter, verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInitialRounds } from "@/lib/rotation";
import { findOrCreatePlayer } from "@/lib/player";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  date: z.string().min(1),
  venueName: z.string().trim().max(120).optional(),
  courts: z.number().int().min(1).max(20),
  courtNames: z.array(z.string().trim().max(60)).max(20).optional(),
  dynamicCourts: z.boolean().optional(),
  sessionType: z.enum(["AMERICANO", "MEXICANO"]).optional(),
  fixedPartners: z.boolean().optional(),
  partnerships: z.array(z.tuple([z.string().max(80), z.string().max(80)])).optional(),
  pointsPerMatch: z.number().int().min(1).max(999).optional(),
  pointsPerServe: z.number().int().min(1).max(999).optional(),
  scoringMode: z.enum(["POINTS", "SET"]).optional(),
  gamesPerSet: z.number().int().min(1).max(20).optional(),
  goldenPoint: z.boolean().optional(),
  playerNames: z.array(z.string().max(80)).max(64),
});

export async function GET(req: NextRequest) {
  const auth = await verifySessionToken(req.cookies.get(AUTH_COOKIE)?.value);
  const isAdmin = auth?.role === "admin";

  const sessions = await prisma.session.findMany({
    where: communityFilter(auth),
    orderBy: { date: "desc" },
    include: {
      players: true,
      rounds: { include: { matches: { select: { completed: true } } } },
      community: { select: { code: true } },
    },
  });

  return NextResponse.json(
    sessions.map((s) => {
      const allMatches = s.rounds.flatMap((r) => r.matches);
      const isLive = allMatches.some((m) => !m.completed);
      const status = allMatches.length === 0 ? null : isLive ? "LIVE" : "COMPLETED";

      return {
        id: s.id,
        name: s.name,
        date: s.date,
        sessionType: s.sessionType,
        courts: s.courts,
        communityCode: isAdmin ? (s.community?.code ?? null) : null,
        playerCount: s.players.length,
        roundCount: s.rounds.length,
        status,
      };
    })
  );
}

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const {
    name,
    date,
    venueName,
    courts,
    courtNames,
    dynamicCourts,
    sessionType,
    fixedPartners,
    partnerships,
    pointsPerMatch,
    pointsPerServe,
    scoringMode,
    gamesPerSet,
    goldenPoint,
    playerNames,
  } = parsed.data;

  const cleanNames = [...new Set(playerNames.map((n) => n.trim()).filter(Boolean))];

  // An empty roster is a valid draft — players self-register later, and
  // teams get assigned from the session page once they have.
  if (fixedPartners && cleanNames.length > 0) {
    if (cleanNames.length < 4 || cleanNames.length % 2 !== 0) {
      return NextResponse.json(
        { error: "Fixed partners requires an even number of players, at least 4" },
        { status: 400 }
      );
    }
    const pairedNames = (partnerships ?? []).flat();
    const allPairedOnce =
      pairedNames.length === cleanNames.length &&
      new Set(pairedNames).size === cleanNames.length &&
      cleanNames.every((n) => pairedNames.includes(n));
    if (!allPairedOnce) {
      return NextResponse.json(
        { error: "Every player must be paired into exactly one team" },
        { status: 400 }
      );
    }
  }

  const auth = await verifySessionToken(req.cookies.get(AUTH_COOKIE)?.value);

  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.session.create({
      data: {
        name,
        date: new Date(date),
        venueName,
        courts,
        courtNames: (courtNames ?? []).slice(0, courts),
        dynamicCourts: dynamicCourts ?? false,
        sessionType: sessionType ?? "AMERICANO",
        fixedPartners: fixedPartners ?? false,
        pointsPerMatch: pointsPerMatch || 21,
        pointsPerServe: pointsPerServe || 5,
        scoringMode: scoringMode ?? "POINTS",
        gamesPerSet: gamesPerSet || 4,
        goldenPoint: goldenPoint ?? true,
        communityId: auth?.role === "member" ? auth.communityId : undefined,
      },
    });

    const nameToPlayerId = new Map<string, string>();
    for (const playerName of cleanNames) {
      const player = await findOrCreatePlayer(tx, playerName);
      nameToPlayerId.set(playerName, player.id);
      await tx.sessionPlayer.create({
        data: { sessionId: created.id, playerId: player.id },
      });
    }

    if (fixedPartners && partnerships) {
      for (const [nameA, nameB] of partnerships) {
        const player1Id = nameToPlayerId.get(nameA);
        const player2Id = nameToPlayerId.get(nameB);
        if (player1Id && player2Id) {
          await tx.fixedPartnership.create({
            data: { sessionId: created.id, player1Id, player2Id },
          });
        }
      }
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
