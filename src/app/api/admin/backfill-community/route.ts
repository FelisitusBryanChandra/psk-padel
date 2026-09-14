import { NextRequest, NextResponse } from "next/server";
import { getDefaultCommunityId } from "@/lib/community";
import { prisma } from "@/lib/prisma";

// One-off (idempotent) migration for sessions created before every session
// was guaranteed a community: tags every still-untagged session (which,
// before this, only ever meant "created by an admin") with the shared
// #PSKPADEL default. Safe to call more than once -- it only ever touches
// rows where communityId is still null.
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const communityId = await getDefaultCommunityId();
  const result = await prisma.session.updateMany({
    where: { communityId: null },
    data: { communityId },
  });

  return NextResponse.json({ updated: result.count });
}
