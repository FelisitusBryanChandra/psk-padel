import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth";
import { computeMatchHistory, HISTORY_PAGE_SIZE } from "@/lib/matchHistory";

export async function GET(req: NextRequest) {
  const auth = await verifySessionToken(req.cookies.get(AUTH_COOKIE)?.value);
  const { searchParams } = new URL(req.url);

  const sessionTypeParam = searchParams.get("sessionType");
  const sessionType =
    sessionTypeParam === "AMERICANO" || sessionTypeParam === "MEXICANO"
      ? sessionTypeParam
      : undefined;

  const offsetParam = Number(searchParams.get("offset"));
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;

  const page = await computeMatchHistory(auth, { sessionType, offset, limit: HISTORY_PAGE_SIZE });
  return NextResponse.json(page);
}
