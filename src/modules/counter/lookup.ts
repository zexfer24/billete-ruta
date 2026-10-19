import type { DocumentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isValidIdNumber, isMinor, normalizeIdNumber } from "@/lib/identity";
import { writeAudit } from "@/modules/audit";
import { ValidationError } from "@/modules/booking";

export type CounterHolderLookup =
  | { found: false; idNumber: string }
  | {
      found: true;
      idNumber: string;
      accountId: string;
      fullName: string;
      holderIsMinor: boolean;
      missingDocuments: DocumentType[];
      hasCedula: boolean;
      hasProfilePhoto: boolean;
      hasTravelPermit: boolean;
      activated: boolean;
    };

/**
 * Consulta al titular por cédula antes de vender en taquilla. Nunca devuelve
 * teléfono ni año de nacimiento: el operador solo necesita saber si la
 * cuenta existe y qué documentos le faltan. Queda auditada siempre, exista
 * o no la cuenta.
 */
export async function lookupCounterHolder(
  rawIdNumber: string,
  panelUser: { id: string; agencyId: string },
  now: Date = new Date(),
): Promise<CounterHolderLookup> {
  const idNumber = normalizeIdNumber(rawIdNumber);
  if (!isValidIdNumber(idNumber)) {
    throw new ValidationError("La cédula no tiene un formato válido.");
  }

  return prisma.$transaction(async (tx) => {
    const cuenta = await tx.passengerAccount.findUnique({
      where: { idNumber },
      include: { documents: true },
    });

    await writeAudit(tx, {
      actorType: "PANEL",
      actorPanelUserId: panelUser.id,
      entityType: "PassengerAccount",
      entityId: cuenta?.id ?? "sin-cuenta",
      action: "CONSULTA_TITULAR_TAQUILLA",
      after: { idNumber, found: cuenta !== null },
    });

    if (!cuenta) {
      return { found: false, idNumber };
    }

    const tipos = new Set(cuenta.documents.map((d) => d.type));
    const hasCedula = tipos.has("CEDULA");
    const hasProfilePhoto = tipos.has("FOTO_PERFIL");
    const hasTravelPermit = tipos.has("PERMISO_VIAJE");
    // Solo se evalúa al titular: los acompañantes se validan al vender.
    const holderIsMinor = isMinor(cuenta.birthYear, now);
    const missingDocuments: DocumentType[] = [];
    if (!hasCedula) missingDocuments.push("CEDULA");
    if (holderIsMinor && !hasTravelPermit) missingDocuments.push("PERMISO_VIAJE");

    return {
      found: true,
      idNumber,
      accountId: cuenta.id,
      fullName: cuenta.fullName,
      holderIsMinor,
      missingDocuments,
      hasCedula,
      hasProfilePhoto,
      hasTravelPermit,
      activated: cuenta.passwordHash !== null,
    };
  });
}
