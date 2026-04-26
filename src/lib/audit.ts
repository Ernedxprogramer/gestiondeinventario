import { prisma } from "@/lib/prisma";

export async function createAuditLog(input: {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      metadata: input.metadata as never
    }
  });
}
