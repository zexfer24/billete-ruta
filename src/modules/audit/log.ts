import type { ActorType, Prisma } from "@prisma/client";

export interface AuditInput {
  actorType: ActorType;
  actorPanelUserId?: string | null;
  actorAccountId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
}

/**
 * Escribe en la bitácora. La tabla es de solo inserción: un disparador de la
 * base de datos rechaza cualquier UPDATE o DELETE sobre ella.
 */
export async function writeAudit(
  tx: Prisma.TransactionClient,
  input: AuditInput,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorType: input.actorType,
      actorPanelUserId: input.actorPanelUserId ?? null,
      actorAccountId: input.actorAccountId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      before: (input.before ?? {}) as Prisma.InputJsonValue,
      after: (input.after ?? {}) as Prisma.InputJsonValue,
      ipAddress: input.ipAddress ?? null,
    },
  });
}
