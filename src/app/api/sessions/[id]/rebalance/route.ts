import { NextResponse } from "next/server";
import { rebalanceUpcomingRounds } from "@/lib/rotation";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const result = await rebalanceUpcomingRounds(id);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Could not rebalance rounds" }, { status: 400 });
  }
}
