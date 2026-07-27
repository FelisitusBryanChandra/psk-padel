import { NextRequest, NextResponse } from "next/server";
import { passcodeToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const NAMED_CODES: Record<string, string> = {
  Bryan: "Bryan123",
  Reynaldo: "Reynaldo123",
  Hersen: "Hersen123",
  Ricky: "Ricky123",
};

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = [];
  for (const [label, code] of Object.entries(NAMED_CODES)) {
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
