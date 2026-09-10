import type { DocumentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertImageBuffer, MAX_IMAGE_BYTES, saveUpload } from "@/lib/storage";
import { writeAudit } from "@/modules/audit";
import { ValidationError } from "@/modules/booking/errors";

export interface UploadDocumentInput {
  accountId: string;
  type: DocumentType;
  originalName: string;
  data: Buffer;
}

/**
 * Guarda un documento del pasajero. Se verifica que el archivo sea realmente
 * una imagen por su firma de bytes, no por lo que declare el navegador.
 */
export async function uploadDocument(
  input: UploadDocumentInput,
): Promise<{ documentId: string; filePath: string }> {
  if (input.data.length === 0) {
    throw new ValidationError("El archivo está vacío.");
  }
  if (input.data.length > MAX_IMAGE_BYTES) {
    throw new ValidationError("La imagen no puede pesar más de 5 MB.");
  }
  assertImageBuffer(input.data);

  const filePath = await saveUpload(
    "documentos",
    input.accountId,
    input.originalName,
    input.data,
  );

  return prisma.$transaction(async (tx) => {
    const documento = await tx.passengerDocument.create({
      data: {
        accountId: input.accountId,
        type: input.type,
        filePath,
        originalName: input.originalName,
      },
    });
    await writeAudit(tx, {
      actorType: "PASAJERO",
      actorAccountId: input.accountId,
      entityType: "PassengerDocument",
      entityId: documento.id,
      action: "DOCUMENTO_CARGADO",
      after: { type: input.type, originalName: input.originalName },
    });
    return { documentId: documento.id, filePath };
  });
}

export async function listDocuments(accountId: string) {
  return prisma.passengerDocument.findMany({
    where: { accountId },
    orderBy: { uploadedAt: "desc" },
  });
}

/** Documentos que faltan para poder concretar una venta. */
export async function missingDocuments(
  accountId: string,
  viajaMenor: boolean,
): Promise<DocumentType[]> {
  const documentos = await prisma.passengerDocument.findMany({
    where: { accountId },
    select: { type: true },
  });
  const tipos = new Set(documentos.map((d) => d.type));
  const faltantes: DocumentType[] = [];
  if (!tipos.has("CEDULA")) faltantes.push("CEDULA");
  if (viajaMenor && !tipos.has("PERMISO_VIAJE")) faltantes.push("PERMISO_VIAJE");
  return faltantes;
}
