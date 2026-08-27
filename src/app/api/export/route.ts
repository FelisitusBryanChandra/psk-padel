import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, communityFilter, verifySessionToken } from "@/lib/auth";
import { courtLabel } from "@/lib/types";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month"); // "YYYY-MM"
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Provide ?month=YYYY-MM" }, { status: 400 });
  }

  const [year, mon] = month.split("-").map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 1);

  const auth = await verifySessionToken(req.cookies.get(AUTH_COOKIE)?.value);

  const sessions = await prisma.session.findMany({
    where: { date: { gte: start, lt: end }, ...communityFilter(auth) },
    orderBy: { date: "asc" },
    include: {
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

  const header = [
    "Session",
    "Date",
    "Round",
    "Court",
    "Team1Player1",
    "Team1Player2",
    "Team2Player1",
    "Team2Player2",
    "Team1Score",
    "Team2Score",
    "Completed",
  ];

  const lines = [header.join(",")];

  for (const session of sessions) {
    for (const round of session.rounds) {
      for (const m of round.matches) {
        lines.push(
          [
            session.name,
            session.date.toISOString().slice(0, 10),
            String(round.roundNumber),
            courtLabel(session, m.courtNumber),
            m.team1Player1.name,
            m.team1Player2.name,
            m.team2Player1.name,
            m.team2Player2.name,
            String(m.team1Score),
            String(m.team2Score),
            m.completed ? "yes" : "no",
          ]
            .map(csvEscape)
            .join(",")
        );
      }
    }
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="psk-padel-${month}.csv"`,
    },
  });
}
