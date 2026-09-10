import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/decimal";
import { formatCaracasDateTime24 } from "@/lib/time";
import { enqueueMessage } from "@/modules/messaging";
import {
  dueForConfirmation2h,
  dueForReminder24h,
  dueForRelease12h,
} from "@/modules/scheduler";
import {
  expireWaitlistClaims,
  processWaitlist,
  transitionReservation,
} from "@/modules/booking";

export interface SweepResult {
  expiredUnpaid: number;
  reminders24h: number;
  released12h: number;
  confirmations2h: number;
  waitlistExpired: number;
  departuresClosed: number;
}

/** Libera las reservas que nunca recibieron un pago dentro del plazo. */
async function sweepExpireUnpaid(now: Date): Promise<number> {
  const vencidas = await prisma.reservation.findMany({
    where: { status: "PENDIENTE_PAGO", expiresAt: { lte: now } },
    include: { account: true },
  });

  let liberadas = 0;
  for (const reserva of vencidas) {
    await transitionReservation({
      reservationId: reserva.id,
      to: "LIBERADA",
      actor: { type: "SISTEMA" },
      reason: "No se registró ningún pago dentro del plazo",
      now,
    });
    await prisma.$transaction((tx) =>
      enqueueMessage(tx, {
        reservationId: reserva.id,
        phone: reserva.account.phone,
        templateKey: "reserva_liberada",
        payload: { nombre: reserva.account.fullName, serial: reserva.code },
      }),
    );
    await processWaitlist(reserva.departureId, now);
    liberadas += 1;
  }
  return liberadas;
}

/** Recordatorio de 24 horas y exigencia de reconfirmación al pago en sitio. */
async function sweepReminder24h(now: Date): Promise<number> {
  const { from, to } = dueForReminder24h(now);
  const reservas = await prisma.reservation.findMany({
    where: {
      status: { in: ["PAGADA", "ABONADA", "PAGO_EN_SITIO"] },
      departure: { departsAt: { gte: from, lte: to }, status: { in: ["PROGRAMADA", "MANIFIESTO_CERRADO"] } },
    },
    include: { account: true, departure: { include: { route: true } } },
  });

  let encolados = 0;
  for (const reserva of reservas) {
    await prisma.$transaction(async (tx) => {
      if (reserva.status === "PAGO_EN_SITIO") {
        await enqueueMessage(tx, {
          reservationId: reserva.id,
          phone: reserva.account.phone,
          templateKey: "reconfirmacion_pago_sitio",
          payload: {
            nombre: reserva.account.fullName,
            serial: reserva.code,
            salida: formatCaracasDateTime24(reserva.departure.departsAt),
            monto: formatMoney(reserva.amountInCurrency, reserva.currency),
          },
        });
      } else {
        await enqueueMessage(tx, {
          reservationId: reserva.id,
          phone: reserva.account.phone,
          templateKey: "recordatorio_24h",
          payload: {
            nombre: reserva.account.fullName,
            serial: reserva.code,
            salida: formatCaracasDateTime24(reserva.departure.departsAt),
            punto: reserva.departure.route.meetingPoint,
            recomendaciones:
              reserva.departure.route.travelTips ??
              "Llega 30 minutos antes con tu cédula en mano.",
          },
        });
      }
    });
    encolados += 1;
  }
  return encolados;
}

/**
 * Libera las reservas de pago en sitio que no reconfirmaron. Una reserva pagada
 * nunca se libera automáticamente, responda o no.
 */
async function sweepRelease12h(now: Date): Promise<number> {
  const corte = dueForRelease12h(now);
  const reservas = await prisma.reservation.findMany({
    where: {
      status: "PAGO_EN_SITIO",
      reconfirmedAt: null,
      departure: { departsAt: { lte: corte }, status: { in: ["PROGRAMADA", "MANIFIESTO_CERRADO"] } },
    },
    include: { account: true },
  });

  let liberadas = 0;
  for (const reserva of reservas) {
    await transitionReservation({
      reservationId: reserva.id,
      to: "LIBERADA",
      actor: { type: "SISTEMA" },
      reason: "No reconfirmó el pago en sitio dentro del plazo",
      now,
    });
    await prisma.$transaction((tx) =>
      enqueueMessage(tx, {
        reservationId: reserva.id,
        phone: reserva.account.phone,
        templateKey: "reserva_liberada",
        payload: { nombre: reserva.account.fullName, serial: reserva.code },
      }),
    );
    await processWaitlist(reserva.departureId, now);
    liberadas += 1;
  }
  return liberadas;
}

/** Confirmación de asistencia dos horas antes de la salida. */
async function sweepConfirmation2h(now: Date): Promise<number> {
  const { from, to } = dueForConfirmation2h(now);
  const reservas = await prisma.reservation.findMany({
    where: {
      OR: [
        { status: "PAGADA" },
        { status: "PAGO_EN_SITIO", reconfirmedAt: { not: null } },
      ],
      departure: { departsAt: { gte: from, lte: to } },
    },
    include: { account: true },
  });

  let encolados = 0;
  for (const reserva of reservas) {
    await prisma.$transaction((tx) =>
      enqueueMessage(tx, {
        reservationId: reserva.id,
        phone: reserva.account.phone,
        templateKey: "confirmacion_2h",
        payload: { nombre: reserva.account.fullName, serial: reserva.code },
      }),
    );
    encolados += 1;
  }
  return encolados;
}

/** Cierra el manifiesto de salidas que ya pasaron y nadie cerró a mano. */
async function sweepAutoClose(now: Date): Promise<number> {
  const resultado = await prisma.departure.updateMany({
    where: { status: "PROGRAMADA", departsAt: { lt: now } },
    data: { status: "MANIFIESTO_CERRADO", manifestClosedAt: now },
  });
  return resultado.count;
}

/** Ejecuta todos los barridos programados en orden. */
export async function runSweeps(now: Date = new Date()): Promise<SweepResult> {
  const expiredUnpaid = await sweepExpireUnpaid(now);
  const reminders24h = await sweepReminder24h(now);
  const released12h = await sweepRelease12h(now);
  const confirmations2h = await sweepConfirmation2h(now);
  const waitlistExpired = await expireWaitlistClaims(now);
  const departuresClosed = await sweepAutoClose(now);

  return {
    expiredUnpaid,
    reminders24h,
    released12h,
    confirmations2h,
    waitlistExpired,
    departuresClosed,
  };
}
