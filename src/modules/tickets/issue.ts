import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/decimal";
import { saveUploadAt } from "@/lib/storage";
import { signTicketCode } from "./qr";
import { renderTicketPdf } from "./pdf";

/**
 * Emite el ticket de una reserva pagada. Es idempotente: al reemitir conserva el
 * mismo contenido de QR para que un ticket ya entregado siga siendo válido.
 */
export async function issueTicket(
  reservationId: string,
): Promise<{ pdfPath: string; qrPayload: string }> {
  const reserva = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: {
      passengers: { orderBy: [{ isHolder: "desc" }, { createdAt: "asc" }] },
      paymentMethod: true,
      ticket: true,
      departure: {
        include: { route: { include: { agency: true } }, vehicle: true },
      },
    },
  });

  if (reserva.status !== "PAGADA" && reserva.status !== "ABORDADA") {
    throw new Error("Solo se emite el ticket de una reserva PAGADA.");
  }

  const qrPayload = reserva.ticket?.qrPayload ?? signTicketCode(reserva.code);

  const pdf = await renderTicketPdf({
    code: reserva.code,
    qrPayload,
    agencyName: reserva.departure.route.agency.name,
    routeName: reserva.departure.route.name,
    origin: reserva.departure.route.origin,
    destination: reserva.departure.route.destination,
    departsAt: reserva.departure.departsAt,
    meetingPoint: reserva.departure.route.meetingPoint,
    vehiclePlate: reserva.departure.vehicle.plate,
    passengers: reserva.passengers.map((p) => ({
      fullName: p.fullName,
      idNumber: p.idNumber,
    })),
    paymentMethodName: reserva.paymentMethod.name,
    fareLabel: formatMoney(reserva.fareTotalUsd, "USD"),
    taxLabel: formatMoney(reserva.taxTotalUsd, "USD"),
    totalLabel: formatMoney(reserva.totalUsd, "USD"),
  });

  const pdfPath =
    reserva.ticket?.pdfPath ?? `tickets/${reserva.id}/${reserva.code}.pdf`;
  await saveUploadAt(pdfPath, pdf);

  await prisma.ticket.upsert({
    where: { reservationId: reserva.id },
    create: { reservationId: reserva.id, pdfPath, qrPayload },
    update: { pdfPath, issuedAt: new Date() },
  });

  return { pdfPath, qrPayload };
}
