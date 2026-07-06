import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updated = await prisma.match.update({
    where: { id },
    data: { completed: true },
  });
  return NextResponse.json(updated);
}
