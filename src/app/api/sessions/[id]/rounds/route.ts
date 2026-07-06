import { NextResponse } from "next/server";
import { generateNextRound } from "@/lib/rotation";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const round = await generateNextRound(id);
    return NextResponse.json(round, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not generate round" }, { status: 400 });
  }
}
