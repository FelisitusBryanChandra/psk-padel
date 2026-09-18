import { NextResponse } from "next/server";
import { computeStandings } from "@/lib/standings";

// No-login counterpart of /api/sessions/[id]/standings, backing the public
// "share matches" link's Standings tab. Same computation either way --
// standings for one already-resolved session carry nothing more sensitive
// than the match data that page already shows.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await computeStandings(id);
  return NextResponse.json(rows);
}
