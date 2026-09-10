import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/identity";
import { writeAudit } from "@/modules/audit";
import { hashPassword } from "@/modules/auth/passwords";
import { ValidationError } from "@/modules/booking/errors";

export interface CreateAgencyInput {
  name: string;
  taxId: string;
  contactPhone: string;
  contactEmail: string;
  operatorName: string;
  operatorEmail: string;
  operatorPassword: string;
  panelUserId: string;
}

/** Alta de una agencia junto con su primer usuario operador. */
export async function createAgencyWithOperator(
  input: CreateAgencyInput,
): Promise<{ agencyId: string; panelUserId: string }> {
  if (input.name.trim().length < 3) {
    throw new ValidationError("El nombre de la agencia es demasiado corto.");
  }
  if (input.operatorPassword.length < 8) {
    throw new ValidationError("La contraseña del operador debe tener al menos 8 caracteres.");
  }
  const passwordHash = await hashPassword(input.operatorPassword);

  try {
    return await prisma.$transaction(async (tx) => {
      const agencia = await tx.agency.create({
        data: {
          name: input.name.trim(),
          taxId: input.taxId.trim().toUpperCase(),
          contactPhone: normalizePhone(input.contactPhone),
          contactEmail: input.contactEmail.trim().toLowerCase(),
        },
      });
      const operador = await tx.panelUser.create({
        data: {
          email: input.operatorEmail.trim().toLowerCase(),
          passwordHash,
          name: input.operatorName.trim(),
          role: "OPERADOR",
          agencyId: agencia.id,
        },
      });
      await writeAudit(tx, {
        actorType: "PANEL",
        actorPanelUserId: input.panelUserId,
        entityType: "Agency",
        entityId: agencia.id,
        action: "AGENCIA_CREADA",
        after: { name: agencia.name, taxId: agencia.taxId, operador: operador.email },
      });
      return { agencyId: agencia.id, panelUserId: operador.id };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ValidationError(
        "Ya existe una agencia con ese RIF o un usuario con ese correo.",
      );
    }
    throw error;
  }
}

export async function setAgencyActive(input: {
  agencyId: string;
  active: boolean;
  panelUserId: string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.agency.update({
      where: { id: input.agencyId },
      data: { active: input.active },
    });
    await writeAudit(tx, {
      actorType: "PANEL",
      actorPanelUserId: input.panelUserId,
      entityType: "Agency",
      entityId: input.agencyId,
      action: input.active ? "AGENCIA_ACTIVADA" : "AGENCIA_DESACTIVADA",
    });
  });
}

export async function listAgencies() {
  return prisma.agency.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      panelUsers: { select: { id: true, email: true, name: true, active: true } },
      _count: { select: { routes: true, vehicles: true, drivers: true } },
    },
  });
}
