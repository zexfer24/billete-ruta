import { durationMinutes, formatCaracasDateTime24, formatDuration } from "@/lib/time";

/** Nivel visual del aviso: define color e icono en la pantalla del pasajero. */
export type NoticeLevel = "alerta" | "info" | "exito";

export type NoticeKind =
  | "DOCUMENTO_FALTANTE"
  | "RESERVA_POR_LIBERAR"
  | "COMPROBANTE_RECHAZADO"
  | "COMPROBANTE_EN_VALIDACION"
  | "RECONFIRMAR_PAGO_EN_SITIO"
  | "TICKET_LISTO";

export interface Notice {
  kind: NoticeKind;
  level: NoticeLevel;
  /** Corto, en español: "Falta la foto de tu cédula". */
  title: string;
  /** Una o dos frases con el dato clave (minutos, motivo, ruta). */
  body: string;
  /** Instante de referencia para ordenar y mostrar hora. */
  at: Date;
  href?: string;
  reservationCode?: string;
}

export interface NoticeReservationInput {
  code: string;
  /** ReservationStatus como string. */
  status: string;
  departsAt: Date;
  origin: string;
  destination: string;
  expiresAt: Date | null;
  reconfirmedAt: Date | null;
  hasTicket: boolean;
  latestProof: { status: string; rejectionReason: string | null; createdAt: Date } | null;
}

export interface NoticeInput {
  hasIdDocument: boolean;
  reservations: NoticeReservationInput[];
}

/** Estados finales de una reserva: no ocupan cupo y no generan más avisos. */
const ESTADOS_FINALES = new Set(["LIBERADA", "CANCELADA", "ABORDADA", "NO_SHOW"]);

const NIVEL_ORDEN: Record<NoticeLevel, number> = { alerta: 0, info: 1, exito: 2 };

const VEINTICUATRO_HORAS_MIN = 24 * 60;

function etiquetaMinutos(minutos: number): string {
  const redondeados = Math.max(minutos, 0);
  return redondeados > 60 ? formatDuration(redondeados) : `${redondeados} min`;
}

function avisosDeReserva(reserva: NoticeReservationInput, now: Date): Notice[] {
  if (reserva.departsAt <= now || ESTADOS_FINALES.has(reserva.status)) return [];

  const avisos: Notice[] = [];
  const href = `/mi/reservas/${reserva.code}`;

  if (reserva.status === "PENDIENTE_PAGO" && reserva.expiresAt && reserva.expiresAt > now) {
    const restante = etiquetaMinutos(durationMinutes(now, reserva.expiresAt));
    avisos.push({
      kind: "RESERVA_POR_LIBERAR",
      level: "alerta",
      title: "Tu reserva está por liberarse",
      body: `Faltan ${restante} para que se libere el cupo si no completas el pago.`,
      at: reserva.expiresAt,
      href,
      reservationCode: reserva.code,
    });
  }

  if (reserva.latestProof?.status === "RECHAZADO") {
    const motivo = reserva.latestProof.rejectionReason;
    avisos.push({
      kind: "COMPROBANTE_RECHAZADO",
      level: "alerta",
      title: "Tu comprobante fue rechazado",
      body: motivo
        ? `No pudimos validar tu comprobante. Motivo: ${motivo}.`
        : "No pudimos validar tu comprobante. Carga uno nuevo para continuar.",
      at: reserva.latestProof.createdAt,
      href,
      reservationCode: reserva.code,
    });
  }

  if (reserva.status === "EN_VALIDACION") {
    avisos.push({
      kind: "COMPROBANTE_EN_VALIDACION",
      level: "info",
      title: "Tu comprobante está en validación",
      body: "Estamos revisando tu comprobante. Te avisaremos cuando se confirme el pago.",
      at: reserva.latestProof?.createdAt ?? now,
      href,
      reservationCode: reserva.code,
    });
  }

  if (
    reserva.status === "PAGO_EN_SITIO" &&
    !reserva.reconfirmedAt &&
    durationMinutes(now, reserva.departsAt) <= VEINTICUATRO_HORAS_MIN
  ) {
    avisos.push({
      kind: "RECONFIRMAR_PAGO_EN_SITIO",
      level: "alerta",
      title: "Reconfirma tu pago en sitio",
      body: `Tu viaje ${reserva.origin} → ${reserva.destination} sale el ${formatCaracasDateTime24(
        reserva.departsAt,
      )}. Reconfirma o el cupo se liberará.`,
      at: reserva.departsAt,
      href,
      reservationCode: reserva.code,
    });
  }

  if (reserva.hasTicket && reserva.status === "PAGADA") {
    avisos.push({
      kind: "TICKET_LISTO",
      level: "exito",
      title: "Tu ticket está listo",
      body: `${reserva.origin} → ${reserva.destination}, sale el ${formatCaracasDateTime24(
        reserva.departsAt,
      )}. Presenta el código QR al abordar.`,
      at: reserva.departsAt,
      href,
      reservationCode: reserva.code,
    });
  }

  return avisos;
}

/** Construye los avisos del pasajero a partir de sus documentos y reservas activas. */
export function buildNotices(input: NoticeInput, now: Date = new Date()): Notice[] {
  const avisos: Notice[] = [];

  if (!input.hasIdDocument) {
    avisos.push({
      kind: "DOCUMENTO_FALTANTE",
      level: "alerta",
      title: "Falta la foto de tu cédula",
      body: "Carga la foto de tu cédula para poder completar una reserva.",
      at: now,
      href: "/mi/documentos",
    });
  }

  for (const reserva of input.reservations) {
    avisos.push(...avisosDeReserva(reserva, now));
  }

  return avisos.sort((a, b) => {
    const nivel = NIVEL_ORDEN[a.level] - NIVEL_ORDEN[b.level];
    if (nivel !== 0) return nivel;
    return a.at.getTime() - b.at.getTime();
  });
}
