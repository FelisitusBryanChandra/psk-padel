import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { team1Score, team2Score } = (await req.json()) as {
    team1Score: number;
    team2Score: number;
  };

  if (
    !Number.isInteger(team1Score) ||
    !Number.isInteger(team2Score) ||
    team1Score < 0 ||
    team2Score < 0
  ) {
    return NextResponse.json({ error: "Invalid scores" }, { status: 400 });
  }

  const updated = await prisma.match.update({
    where: { id },
    data: { team1Score, team2Score, completed: true },
  });

  return NextResponse.json(updated);
}
