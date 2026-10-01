import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isMinor, isValidBirthYear, isValidIdNumber, normalizeIdNumber } from "@/lib/identity";
import { formatCaracasDateTime24 } from "@/lib/time";
import { formatMoney } from "@/lib/decimal";
import { ForbiddenError } from "@/modules/auth/permissions";
import { writeAudit } from "@/modules/audit";
import { computeAmounts } from "@/modules/catalog/pricing";
import {
  getCurrentDepartureTax,
  getCurrentExchangeRate,
  missingExchangeRateMessage,
} from "@/modules/catalog/rates";
import { enqueueMessage, messageRoute } from "@/modules/messaging";
import { UNPAID_EXPIRY_MINUTES, cashCounterDeadline, paymentDeadline } from "@/modules/scheduler";
import { getAvailability } from "./availability";
import {
  DepartureClosedError,
  MissingDocumentsError,
  NoSeatsAvailableError,
  ValidationError,
} from "./errors";
import { generateReservationCode, MAX_PASSENGERS_PER_RESERVATION } from "./reservation-code";

/** No se permite pagar en sitio cuando falta poco para la salida. */
const CASH_MIN_LEAD_HOURS = 12;
const CODE_ATTEMPTS = 5;

export interface CompanionInput {
  fullName: string;
  idNumber: string;
  birthYear: number;
}

export interface CreateReservationInput {
  accountId: string;
  departureId: string;
  paymentMethodId: string;
  companions: CompanionInput[];
  policiesAccepted: boolean;
  now?: Date;
}

export interface CreateReservationResult {
  reservationId: string;
  code: string;
  publicToken: string;
  totalUsd: string;
  status: "PENDIENTE_PAGO" | "PAGO_EN_SITIO";
}

/**
 * Canal por el que se crea la reserva. La app del pasajero no aporta datos
 * adicionales; la taquilla identifica al operador y su agencia, para el
 * aislamiento por agencia y para dejar constancia de quién vendió.
 */
export type ReservationChannelOptions =
  | { channel: "APP" }
  | { channel: "TAQUILLA"; panelUserId: string; agencyId: string };

/**
 * Crea una reserva descontando cupo de forma segura, dentro de la transacción
 * que le pase el llamador. El bloqueo de la fila de la salida impide que dos
 * compras simultáneas vendan el mismo puesto.
 *
 * El canal `APP` reproduce el comportamiento de siempre. El canal `TAQUILLA`
 * exige un método de pago físico, se salta la regla de las 12 horas porque el
 * cobro ocurre en la misma transacción, deja la reserva en `PAGO_EN_SITIO` y
 * no encola el mensaje de reserva condicional: el ticket lo avisa el cobro.
 */
export async function createReservationInTx(
  tx: Prisma.TransactionClient,
  input: CreateReservationInput,
  options: ReservationChannelOptions,
): Promise<CreateReservationResult> {
  const ahora = input.now ?? new Date();

  if (!input.policiesAccepted) {
    throw new ValidationError("Debes aceptar las políticas para completar la reserva.");
  }

  const cuenta = await tx.passengerAccount.findUniqueOrThrow({
    where: { id: input.accountId },
    include: { documents: true },
  });

  const passengerCount = input.companions.length + 1;
  if (passengerCount < 1 || passengerCount > MAX_PASSENGERS_PER_RESERVATION) {
    throw new ValidationError("La cantidad de pasajeros debe estar entre 1 y 6.");
  }

  for (const acompanante of input.companions) {
    if (acompanante.fullName.trim().length < 3) {
      throw new ValidationError("Cada acompañante necesita su nombre completo.");
    }
    if (!isValidIdNumber(acompanante.idNumber)) {
      throw new ValidationError(
        `La cédula "${acompanante.idNumber}" no tiene un formato válido.`,
      );
    }
    if (!isValidBirthYear(acompanante.birthYear, ahora)) {
      throw new ValidationError("El año de nacimiento de cada acompañante debe ser válido.");
    }
  }

  // Documentos: la foto de cédula es obligatoria para concretar la venta y el
  // permiso de viaje se exige si viaja alguien menor de edad. Cuentan los
  // documentos ya creados en esta misma transacción.
  const tieneCedula = cuenta.documents.some((d) => d.type === "CEDULA");
  if (!tieneCedula) {
    throw new MissingDocumentsError(
      "Antes de reservar debes cargar la foto de tu cédula en la sección Documentos.",
    );
  }
  const viajaMenor =
    isMinor(cuenta.birthYear, ahora) ||
    input.companions.some((c) => isMinor(c.birthYear, ahora));
  if (viajaMenor && !cuenta.documents.some((d) => d.type === "PERMISO_VIAJE")) {
    throw new MissingDocumentsError(
      "Viaja un menor de edad: debes cargar el permiso de viaje en la sección Documentos.",
    );
  }

  const metodo = await tx.paymentMethod.findUniqueOrThrow({
    where: { id: input.paymentMethodId },
  });
  if (!metodo.active) {
    throw new ValidationError("Ese método de pago no está disponible.");
  }
  if (options.channel === "TAQUILLA" && metodo.kind !== "FISICO") {
    throw new ValidationError("La venta en taquilla requiere un método de pago en efectivo.");
  }

  const tasaCambio = await getCurrentExchangeRate(metodo.currency, ahora, tx);
  const tasaSalida = await getCurrentDepartureTax(ahora, tx);
  if ((metodo.currency === "VES" || metodo.currency === "COP") && tasaCambio === null) {
    throw new ValidationError(missingExchangeRateMessage(metodo.currency));
  }

  // Serializa a los compradores de esta salida antes de contar puestos.
  await tx.$queryRaw`SELECT id FROM "Departure" WHERE id = ${input.departureId}::uuid FOR UPDATE`;

  const salida = await tx.departure.findUniqueOrThrow({
    where: { id: input.departureId },
    include: { route: true },
  });

  if (options.channel === "TAQUILLA" && salida.route.agencyId !== options.agencyId) {
    throw new ForbiddenError("OPERADOR", "sales.counter");
  }

  // El método de pago debe ser del terminal (`agencyId: null`) o de la
  // agencia de la salida; nunca de otra agencia (ver hallazgo I3 de la ronda 4).
  if (metodo.agencyId !== null && metodo.agencyId !== salida.route.agencyId) {
    throw new ValidationError("Ese método de pago no está disponible.");
  }

  if (salida.status !== "PROGRAMADA") {
    throw new DepartureClosedError();
  }
  if (salida.departsAt <= ahora) {
    throw new DepartureClosedError("Esta salida ya partió.");
  }

  const horasParaSalida = (salida.departsAt.getTime() - ahora.getTime()) / 3_600_000;
  if (options.channel === "APP" && metodo.kind === "FISICO" && horasParaSalida < CASH_MIN_LEAD_HOURS) {
    throw new ValidationError(
      "El pago en sitio solo se admite con más de 12 horas de anticipación. Elige un método digital.",
    );
  }

  const disponibilidad = await getAvailability(input.departureId, tx);
  if (disponibilidad.available < passengerCount) {
    throw new NoSeatsAvailableError(disponibilidad.available);
  }

  const montos = computeAmounts({
    fareUsd: salida.route.fareUsd,
    taxPerPassengerUsd: tasaSalida,
    passengerCount,
    currency: metodo.currency,
    rateFromUsd: tasaCambio,
  });

  const estado = metodo.kind === "DIGITAL" ? "PENDIENTE_PAGO" : "PAGO_EN_SITIO";
  const code = generateReservationCode(salida.departsAt, passengerCount);
  const publicToken = randomUUID();

  const reserva = await tx.reservation.create({
    data: {
      code,
      publicToken,
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      status: estado,
      salesChannel: options.channel,
      soldByPanelUserId: options.channel === "TAQUILLA" ? options.panelUserId : null,
      passengerCount,
      policiesAcceptedAt: ahora,
      fareUsd: salida.route.fareUsd,
      fareTotalUsd: montos.fareTotalUsd,
      taxPerPassengerUsd: tasaSalida,
      taxTotalUsd: montos.taxTotalUsd,
      totalUsd: montos.totalUsd,
      currency: metodo.currency,
      exchangeRateUsed: montos.exchangeRateUsed,
      amountInCurrency: montos.amountInCurrency,
      expiresAt:
        estado === "PENDIENTE_PAGO"
          ? new Date(ahora.getTime() + UNPAID_EXPIRY_MINUTES * 60_000)
          : null,
    },
  });

  await tx.passenger.create({
    data: {
      reservationId: reserva.id,
      fullName: cuenta.fullName,
      idNumber: cuenta.idNumber,
      birthYear: cuenta.birthYear,
      isHolder: true,
    },
  });
  for (const acompanante of input.companions) {
    await tx.passenger.create({
      data: {
        reservationId: reserva.id,
        fullName: acompanante.fullName.trim(),
        idNumber: normalizeIdNumber(acompanante.idNumber),
        birthYear: acompanante.birthYear,
        isHolder: false,
      },
    });
  }

  await writeAudit(tx, {
    actorType: options.channel === "TAQUILLA" ? "PANEL" : "PASAJERO",
    actorPanelUserId: options.channel === "TAQUILLA" ? options.panelUserId : undefined,
    actorAccountId: options.channel === "TAQUILLA" ? null : cuenta.id,
    entityType: "Reservation",
    entityId: reserva.id,
    action: "RESERVA_CREADA",
    after: {
      code,
      passengerCount,
      totalUsd: montos.totalUsd.toString(),
      status: estado,
      ...(options.channel === "TAQUILLA" ? { channel: "TAQUILLA" } : {}),
    },
  });

  if (options.channel === "APP") {
    if (estado === "PENDIENTE_PAGO") {
      await enqueueMessage(tx, {
        reservationId: reserva.id,
        phone: cuenta.phone,
        templateKey: "solicitud_recibida",
        payload: {
          nombre: cuenta.fullName,
          pasajeros: String(passengerCount),
          serial: code,
          ruta: messageRoute(salida.route),
          salida: formatCaracasDateTime24(salida.departsAt),
          // El mismo plazo que muestra la app: 2 horas, o la salida si es antes.
          limite: formatCaracasDateTime24(
            paymentDeadline(
              { status: estado, departsAt: salida.departsAt, expiresAt: reserva.expiresAt },
              ahora,
            )?.at ??
              reserva.expiresAt ??
              salida.departsAt,
          ),
        },
      });
    } else {
      await enqueueMessage(tx, {
        reservationId: reserva.id,
        phone: cuenta.phone,
        templateKey: "reserva_condicional",
        payload: {
          nombre: cuenta.fullName,
          serial: code,
          monto: formatMoney(montos.amountInCurrency, metodo.currency),
          ruta: messageRoute(salida.route),
          salida: formatCaracasDateTime24(salida.departsAt),
          limite: formatCaracasDateTime24(cashCounterDeadline(salida.departsAt, ahora)),
        },
      });
    }
  }

  return {
    reservationId: reserva.id,
    code,
    publicToken,
    totalUsd: montos.totalUsd.toString(),
    status: estado,
  };
}

/**
 * API del pasajero: crea una reserva desde la app. Reintenta si el serial
 * generado choca con uno existente.
 */
export async function createReservation(
  input: CreateReservationInput,
): Promise<CreateReservationResult> {
  let ultimoError: unknown;

  for (let intento = 0; intento < CODE_ATTEMPTS; intento += 1) {
    try {
      return await prisma.$transaction((tx) =>
        createReservationInTx(tx, input, { channel: "APP" }),
      );
    } catch (error) {
      // Solo se reintenta si el serial chocó; cualquier otro error sube tal cual.
      const esChoqueDeSerial =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        String(error.meta?.target ?? "").includes("code");
      if (!esChoqueDeSerial) throw error;
      ultimoError = error;
    }
  }

  throw new Error(
    `No se pudo generar un serial único para la reserva: ${String(ultimoError)}`,
  );
}
