import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_MAX_AGE, passcodeToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { passcode } = await req.json();

  if (!passcode || passcode !== process.env.APP_PASSCODE) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }

  const token = await passcodeToken(passcode);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: AUTH_MAX_AGE,
    path: "/",
  });
  return res;
}
