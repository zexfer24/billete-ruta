import { randomUUID } from "node:crypto";
import type { Currency, DocumentType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeIdNumber } from "@/lib/identity";
import { InvalidImageError, MAX_IMAGE_BYTES, assertImageBuffer, deleteUpload, saveUpload } from "@/lib/storage";
import { createCounterAccount, createDocumentInTx } from "@/modules/accounts";
import { ValidationError, createReservationInTx } from "@/modules/booking";
import type { CompanionInput } from "@/modules/booking";
import { registerCashPaymentInTx } from "@/modules/payments";
import { issueTicket } from "@/modules/tickets";

/** Intentos ante un choque de serial al crear la reserva dentro de la venta. */
const SALE_ATTEMPTS = 5;

const DOCUMENT_LABELS = {
  cedula: "cédula",
  profilePhoto: "foto de perfil",
  travelPermit: "permiso de viaje",
} as const;
const DOCUMENT_TYPES: Record<keyof typeof DOCUMENT_LABELS, DocumentType> = {
  cedula: "CEDULA",
  profilePhoto: "FOTO_PERFIL",
  travelPermit: "PERMISO_VIAJE",
};

export interface CounterUpload {
  originalName: string;
  data: Buffer;
}

export interface CounterSaleInput {
  panelUserId: string;
  agencyId: string;
  departureId: string;
  paymentMethodId: string;
  holder: {
    idNumber: string;
    givenNames?: string;
    surnames?: string;
    phone?: string;
    birthYear?: number;
  };
  companions: CompanionInput[];
  /** `profilePhoto` es opcional siempre: nunca bloquea la venta. */
  documents: { cedula?: CounterUpload; profilePhoto?: CounterUpload; travelPermit?: CounterUpload };
  policiesAccepted: boolean;
  now?: Date;
}

export interface CounterSaleResult {
  reservationId: string;
  code: string;
  accountId: string;
  accountCreated: boolean;
  totalUsd: string;
  amountCharged: string;
  currency: Currency;
  ticket: { pdfPath: string; qrPayload: string };
}

/**
 * Venta completa en el mostrador: busca o crea la cuenta del titular, guarda
 * sus documentos, crea la reserva con método físico y cobra el total en la
 * misma operación. Si algo falla, no queda ni cuenta, ni documento, ni
 * reserva, ni cobro, y cualquier archivo ya guardado en disco se borra.
 */
export async function sellAtCounter(input: CounterSaleInput): Promise<CounterSaleResult> {
  const ahora = input.now ?? new Date();

  // 1. Los archivos se validan antes que cualquier otra cosa, igual que uploadDocument.
  for (const key of Object.keys(DOCUMENT_LABELS) as Array<keyof typeof DOCUMENT_LABELS>) {
    const archivo = input.documents[key];
    if (!archivo) continue;
    if (archivo.data.length === 0) {
      throw new ValidationError(`El archivo de ${DOCUMENT_LABELS[key]} está vacío.`);
    }
    if (archivo.data.length > MAX_IMAGE_BYTES) {
      throw new ValidationError(`El archivo de ${DOCUMENT_LABELS[key]} no puede pesar más de 5 MB.`);
    }
    try {
      assertImageBuffer(archivo.data);
    } catch (error) {
      if (error instanceof InvalidImageError) {
        throw new ValidationError(
          `El archivo de ${DOCUMENT_LABELS[key]} no es una imagen válida (JPG, PNG o WebP).`,
        );
      }
      throw error;
    }
  }

  // 2. La cuenta: la existente, o una nueva si faltan los datos completos del titular.
  const idNumber = normalizeIdNumber(input.holder.idNumber);
  const existente = await prisma.passengerAccount.findUnique({ where: { idNumber } });
  const accountCreated = existente === null;

  if (accountCreated) {
    if (
      !input.holder.givenNames ||
      !input.holder.surnames ||
      !input.holder.phone ||
      input.holder.birthYear === undefined
    ) {
      throw new ValidationError(
        "Completa nombres, apellidos, teléfono y año de nacimiento del titular.",
      );
    }
  }
  const accountId = existente?.id ?? randomUUID();

  // 3. Los archivos se guardan antes de la transacción, para poder borrarlos si algo falla.
  const rutasGuardadas: string[] = [];
  const documentosParaCrear: { type: DocumentType; filePath: string; originalName: string }[] = [];

  let resultado:
    | {
        reservationId: string;
        code: string;
        totalUsd: string;
        amountInCurrency: string;
        currency: Currency;
      }
    | undefined;

  try {
    for (const key of Object.keys(DOCUMENT_LABELS) as Array<keyof typeof DOCUMENT_LABELS>) {
      const archivo = input.documents[key];
      if (!archivo) continue;
      const filePath = await saveUpload("documentos", accountId, archivo.originalName, archivo.data);
      rutasGuardadas.push(filePath);
      documentosParaCrear.push({ type: DOCUMENT_TYPES[key], filePath, originalName: archivo.originalName });
    }

    let ultimoError: unknown;

    // 4. Hasta cinco intentos: solo se reintenta si el serial de la reserva chocó.
    for (let intento = 0; intento < SALE_ATTEMPTS && !resultado; intento += 1) {
      try {
        resultado = await prisma.$transaction(
          async (tx) => {
            if (accountCreated) {
              await createCounterAccount(tx, {
                id: accountId,
                idNumber,
                givenNames: input.holder.givenNames!,
                surnames: input.holder.surnames!,
                phone: input.holder.phone!,
                birthYear: input.holder.birthYear!,
                panelUserId: input.panelUserId,
                now: ahora,
              });
            }

            for (const documento of documentosParaCrear) {
              await createDocumentInTx(tx, {
                accountId,
                type: documento.type,
                filePath: documento.filePath,
                originalName: documento.originalName,
                actor: { type: "PANEL", panelUserId: input.panelUserId },
              });
            }

            const reserva = await createReservationInTx(
              tx,
              {
                accountId,
                departureId: input.departureId,
                paymentMethodId: input.paymentMethodId,
                companions: input.companions,
                policiesAccepted: input.policiesAccepted,
                now: ahora,
              },
              { channel: "TAQUILLA", panelUserId: input.panelUserId, agencyId: input.agencyId },
            );

            const filaReserva = await tx.reservation.findUniqueOrThrow({
              where: { id: reserva.reservationId },
            });

            const cobro = await registerCashPaymentInTx(tx, {
              reservationId: reserva.reservationId,
              panelUserId: input.panelUserId,
              agencyId: input.agencyId,
              amount: filaReserva.amountInCurrency.toString(),
              currency: filaReserva.currency,
              amountUsdOverride: filaReserva.totalUsd,
              now: ahora,
            });

            if (cobro.shouldIssueTicket !== true) {
              throw new Error("La venta en taquilla no dejó la reserva pagada.");
            }

            return {
              reservationId: reserva.reservationId,
              code: reserva.code,
              totalUsd: reserva.totalUsd,
              amountInCurrency: filaReserva.amountInCurrency.toString(),
              currency: filaReserva.currency,
            };
          },
          { timeout: 15_000 },
        );
      } catch (error) {
        const esP2002 = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        const target = esP2002 ? String(error.meta?.target ?? "") : "";

        if (esP2002 && target.includes("idNumber")) {
          throw new ValidationError(
            "Otra operación registró esta cédula al mismo tiempo. Intenta de nuevo.",
          );
        }
        if (!esP2002 || !target.includes("code")) throw error;
        ultimoError = error;
      }
    }

    if (!resultado) {
      throw new Error(`No se pudo generar un serial único para la venta: ${String(ultimoError)}`);
    }
  } catch (error) {
    // Atomicidad hacia el disco: si la venta no se concreta (la transacción no
    // llegó a comprometerse), ningún archivo guardado debe sobrevivir.
    for (const ruta of rutasGuardadas) {
      try {
        await deleteUpload(ruta);
      } catch {
        // Un fallo al borrar no debe ocultar el error original de la venta.
      }
    }
    throw error;
  }

  // La reserva, sus documentos y el cobro ya están comprometidos en base de
  // datos: si emitir el ticket falla de aquí en adelante, el error sube tal
  // cual y la reserva queda PAGADA sin PDF, igual que en la aprobación de
  // pagos actual. No corresponde borrar los archivos ya persistidos.
  const ticket = await issueTicket(resultado.reservationId);

  return {
    reservationId: resultado.reservationId,
    code: resultado.code,
    accountId,
    accountCreated,
    totalUsd: resultado.totalUsd,
    amountCharged: resultado.amountInCurrency,
    currency: resultado.currency,
    ticket,
  };
}
