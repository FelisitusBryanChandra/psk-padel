import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_MAX_AGE, passcodeToken, sessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;

export async function POST(req: NextRequest) {
  const { passcode } = await req.json();

  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recentFailures = await prisma.loginAttempt.count({
    where: { createdAt: { gte: since } },
  });
  if (recentFailures >= RATE_LIMIT_MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  let valid = !!passcode && passcode === process.env.APP_PASSCODE;

  if (!valid && passcode) {
    const hash = await passcodeToken(passcode);
    const namedCode = await prisma.loginCode.findFirst({ where: { codeHash: hash } });
    valid = !!namedCode;
  }

  if (!valid) {
    await prisma.loginAttempt.create({ data: {} });
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }

  const token = await sessionToken();
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
