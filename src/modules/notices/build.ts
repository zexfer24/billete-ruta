import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale/es";
import {
  BUSINESS_TZ,
  durationMinutes,
  formatCaracasDate,
  formatCaracasTime24,
  formatDuration,
} from "@/lib/time";
import { dueForRelease12h } from "@/modules/scheduler";

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

/** Estados finales de una reserva: no ocupan puesto y no generan más avisos. */
const ESTADOS_FINALES = new Set(["LIBERADA", "CANCELADA", "ABORDADA", "NO_SHOW"]);

const NIVEL_ORDEN: Record<NoticeLevel, number> = { alerta: 0, info: 1, exito: 2 };

const VEINTICUATRO_HORAS_MIN = 24 * 60;

function etiquetaMinutos(minutos: number): string {
  const redondeados = Math.max(minutos, 0);
  return redondeados > 60 ? formatDuration(redondeados) : `${redondeados} min`;
}

const UN_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Hora con su día en palabras, en hora de Caracas y formato de 24 horas:
 * "hoy a las 14:30", "mañana a las 08:00" o "el lun 12 oct a las 08:00". Es
 * la misma frase que usa el detalle de la reserva (`whenPhrase`).
 */
function cuando(fecha: Date, now: Date): string {
  const dia = formatCaracasDate(fecha);
  const hora = formatCaracasTime24(fecha);
  if (dia === formatCaracasDate(now)) return `hoy a las ${hora}`;
  if (dia === formatCaracasDate(new Date(now.getTime() + UN_DIA_MS))) return `mañana a las ${hora}`;
  return `el ${formatInTimeZone(fecha, BUSINESS_TZ, "EEE d MMM", { locale: es })} a las ${hora}`;
}

/**
 * Hora límite para pagar en la taquilla: la salida menos el mismo plazo con el
 * que el barrido libera el puesto (`dueForRelease12h`), para que el aviso y la
 * liberación nunca se desalineen.
 */
function limitePagoEnTaquilla(salida: Date, now: Date): Date {
  const plazoMs = dueForRelease12h(now).getTime() - now.getTime();
  return new Date(salida.getTime() - plazoMs);
}

function avisosDeReserva(reserva: NoticeReservationInput, now: Date): Notice[] {
  if (reserva.departsAt <= now || ESTADOS_FINALES.has(reserva.status)) return [];

  const avisos: Notice[] = [];
  const href = `/mi/reservas/${reserva.code}`;
  // Cada aviso de una reserva nombra su viaje: el pasajero puede tener varias
  // reservas a la vez y no debe adivinar a cuál se refiere.
  const viaje = `${reserva.origin} → ${reserva.destination}`;

  if (reserva.status === "PENDIENTE_PAGO" && reserva.expiresAt && reserva.expiresAt > now) {
    const restante = etiquetaMinutos(durationMinutes(now, reserva.expiresAt));
    avisos.push({
      kind: "RESERVA_POR_LIBERAR",
      level: "alerta",
      title: "Paga pronto para no perder tu puesto",
      body: `Te quedan ${restante} para pagar tu viaje ${viaje}. Si no pagas, tu puesto queda libre para otra persona.`,
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
      title: "No pudimos aceptar tu pago",
      body: motivo
        ? `Revisamos tu comprobante del viaje ${viaje} y no lo aceptamos. Motivo: ${motivo}. Envía otro para seguir.`
        : `Revisamos tu comprobante del viaje ${viaje} y no lo aceptamos. Envía otro para seguir.`,
      at: reserva.latestProof.createdAt,
      href,
      reservationCode: reserva.code,
    });
  }

  if (reserva.status === "EN_VALIDACION") {
    avisos.push({
      kind: "COMPROBANTE_EN_VALIDACION",
      level: "info",
      title: "Estamos revisando tu pago",
      body: `Ya recibimos tu comprobante del viaje ${viaje}, que sale ${cuando(
        reserva.departsAt,
        now,
      )}. Te avisaremos cuando confirmemos el pago.`,
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
    const limite = limitePagoEnTaquilla(reserva.departsAt, now);
    // Si el plazo ya venció, el barrido libera el puesto en breve: el aviso no
    // ofrece un plazo que ya pasó.
    if (limite > now) {
      avisos.push({
        kind: "RECONFIRMAR_PAGO_EN_SITIO",
        level: "alerta",
        title: "Paga en la taquilla para no perder tu puesto",
        body: `Tu viaje ${viaje} sale ${cuando(
          reserva.departsAt,
          now,
        )}. Tienes hasta ${cuando(limite, now)} para pagar en la taquilla; si no, tu puesto quedará libre.`,
        at: limite,
        href,
        reservationCode: reserva.code,
      });
    }
  }

  if (reserva.hasTicket && reserva.status === "PAGADA") {
    avisos.push({
      kind: "TICKET_LISTO",
      level: "exito",
      title: "Tu ticket está listo",
      body: `Tu viaje ${viaje} sale ${cuando(
        reserva.departsAt,
        now,
      )}. Muestra el código QR al abordar.`,
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
      body: "Sube una foto de tu cédula para poder reservar tu pasaje.",
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
