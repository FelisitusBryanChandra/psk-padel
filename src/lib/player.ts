import type { Prisma } from "@/generated/prisma/client";

export async function findOrCreatePlayer(tx: Prisma.TransactionClient, name: string) {
  const existing = await tx.player.findFirst({ where: { name } });
  if (existing) return existing;
  return tx.player.create({ data: { name } });
}
