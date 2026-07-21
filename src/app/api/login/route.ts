import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE, AUTH_MAX_AGE, makeSessionToken, passcodeToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;

const bodySchema = z.object({ passcode: z.string().min(1).max(200) });

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }
  const { passcode } = parsed.data;

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

  let role: "admin" | "member" | null = null;
  let communityId: string | undefined;

  if (passcode === process.env.APP_PASSCODE) {
    role = "admin";
  } else {
    const hash = await passcodeToken(passcode);
    const namedCode = await prisma.loginCode.findFirst({ where: { codeHash: hash } });
    if (namedCode) {
      role = "member";
      communityId = namedCode.communityId ?? undefined;
    }
  }

  if (!role) {
    await prisma.loginAttempt.create({ data: {} });
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }

  const token = await makeSessionToken({ role, communityId });
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
