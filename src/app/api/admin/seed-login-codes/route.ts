import { NextRequest, NextResponse } from "next/server";
import { passcodeToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const NAMED_CODES: Record<string, { passcode: string; community?: string }> = {
  Bryan: { passcode: "Bryan123" },
  Reynaldo: { passcode: "Reynaldo123" },
  Hersen: { passcode: "Hersen123" },
  Ricky: { passcode: "Ricky123" },
  Daniel: { passcode: "Daniel123", community: "KANTO" },
};

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = [];
  for (const [label, { passcode, community }] of Object.entries(NAMED_CODES)) {
    const codeHash = await passcodeToken(passcode);
    const communityId = community
      ? (
          await prisma.community.upsert({
            where: { code: community },
            create: { name: community, code: community },
            update: {},
          })
        ).id
      : undefined;

    const existing = await prisma.loginCode.findFirst({ where: { label } });
    if (existing) {
      await prisma.loginCode.update({ where: { id: existing.id }, data: { codeHash, communityId } });
    } else {
      await prisma.loginCode.create({ data: { label, codeHash, communityId } });
    }
    results.push(label);
  }

  return NextResponse.json({ seeded: results });
}
