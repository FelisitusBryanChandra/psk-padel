import { NextResponse } from "next/server";
import { computeStandings } from "@/lib/standings";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await computeStandings(id);
  return NextResponse.json(rows);
}
