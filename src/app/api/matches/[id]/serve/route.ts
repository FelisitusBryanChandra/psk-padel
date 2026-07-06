import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cycleServe } from "@/lib/serve";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const match = await prisma.match.findUnique({ where: { id } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const next = cycleServe(match);
  const updated = await prisma.match.update({ where: { id }, data: next });

  return NextResponse.json(updated);
}
