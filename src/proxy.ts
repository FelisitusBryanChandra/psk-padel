import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, passcodeToken } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  const expected = await passcodeToken(process.env.APP_PASSCODE ?? "");

  if (cookie === expected) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!login|api/login|api/cron|_next/static|_next/image|favicon.ico).*)",
  ],
};
