import { prisma } from "@/lib/prisma";

// Sessions created by an admin (not a member logged into one of the named
// per-community codes) all belong to this one shared community, so they
// show up with a #PSKPADEL tag and can be filtered on Home like any other
// community instead of falling through as untagged.
export const DEFAULT_ADMIN_COMMUNITY_CODE = "PSKPADEL";

export async function getDefaultCommunityId(): Promise<string> {
  const community = await prisma.community.upsert({
    where: { code: DEFAULT_ADMIN_COMMUNITY_CODE },
    create: { name: "PSK Padel", code: DEFAULT_ADMIN_COMMUNITY_CODE },
    update: {},
  });
  return community.id;
}
