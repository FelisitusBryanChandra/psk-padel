import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth";
import { computeMatchHistory } from "@/lib/matchHistory";

export async function GET(req: NextRequest) {
  const auth = await verifySessionToken(req.cookies.get(AUTH_COOKIE)?.value);
  const history = await computeMatchHistory(auth);
  return NextResponse.json(history);
}
