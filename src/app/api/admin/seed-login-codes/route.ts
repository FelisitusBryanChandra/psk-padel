import { NextRequest, NextResponse } from "next/server";
import { passcodeToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Format: "Name:code,Name:code" — kept out of source since these are real
// shared passcodes; set NAMED_LOGIN_CODES in the environment instead.
function namedCodesFromEnv(): Record<string, string> {
  const raw = process.env.NAMED_LOGIN_CODES ?? "";
  const entries = raw
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [label, code] = pair.split(":");
      return [label?.trim(), code?.trim()] as const;
    })
    .filter((pair): pair is [string, string] => Boolean(pair[0] && pair[1]));
  return Object.fromEntries(entries);
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const namedCodes = namedCodesFromEnv();
  if (Object.keys(namedCodes).length === 0) {
    return NextResponse.json(
      { error: "NAMED_LOGIN_CODES is not set — expected \"Name:code,Name:code\"" },
      { status: 500 }
    );
  }

  const results = [];
  for (const [label, code] of Object.entries(namedCodes)) {
    const codeHash = await passcodeToken(code);
    const existing = await prisma.loginCode.findFirst({ where: { label } });
    if (existing) {
      await prisma.loginCode.update({ where: { id: existing.id }, data: { codeHash } });
    } else {
      await prisma.loginCode.create({ data: { label, codeHash } });
    }
    results.push(label);
  }

  return NextResponse.json({ seeded: results });
}
