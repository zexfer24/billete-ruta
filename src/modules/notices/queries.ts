import { formatMoney } from "@/lib/decimal";
import { prisma } from "@/lib/prisma";
import { listDocuments } from "@/modules/accounts";
import { balanceUsd } from "@/modules/catalog";
import type { Notice, NoticeReservationInput } from "./build";
import { buildNotices } from "./build";

/** Avisos vigentes de una cuenta: documentos faltantes y estado de sus reservas activas. */
export async function listNoticesForAccount(accountId: string, now: Date = new Date()): Promise<Notice[]> {
  const [documentos, reservas] = await Promise.all([
    listDocuments(accountId),
    prisma.reservation.findMany({
      where: { accountId, departure: { departsAt: { gt: now } } },
      include: {
        departure: { include: { route: true } },
        ticket: true,
        proofs: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
  ]);

  const hasIdDocument = documentos.some((documento) => documento.type === "CEDULA");

  const reservationInputs: NoticeReservationInput[] = reservas.map((reserva) => {
    const ultimoComprobante = reserva.proofs[0] ?? null;
    return {
      code: reserva.code,
      status: reserva.status,
      departsAt: reserva.departure.departsAt,
      origin: reserva.departure.route.origin,
      destination: reserva.departure.route.destination,
      expiresAt: reserva.expiresAt,
      reconfirmedAt: reserva.reconfirmedAt,
      hasTicket: reserva.ticket !== null,
      balance:
        reserva.status === "ABONADA" ? formatMoney(balanceUsd(reserva.totalUsd, reserva.paidUsd), "USD") : null,
      latestProof: ultimoComprobante
        ? {
            status: ultimoComprobante.status,
            rejectionReason: ultimoComprobante.rejectionReason,
            createdAt: ultimoComprobante.createdAt,
          }
        : null,
    };
  });

  return buildNotices({ hasIdDocument, reservations: reservationInputs }, now);
}
