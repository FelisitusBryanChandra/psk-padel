import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth";
import { computeCommunityStats } from "@/lib/communityStats";

export async function GET(req: NextRequest) {
  const auth = await verifySessionToken(req.cookies.get(AUTH_COOKIE)?.value);
  const stats = await computeCommunityStats(auth);
  return NextResponse.json(stats);
}
