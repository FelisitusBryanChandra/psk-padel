import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await verifySessionToken(req.cookies.get(AUTH_COOKIE)?.value);
  return NextResponse.json({ role: auth?.role ?? null, communityId: auth?.communityId ?? null });
}
