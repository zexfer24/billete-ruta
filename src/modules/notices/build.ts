import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale/es";
import {
  BUSINESS_TZ,
  durationMinutes,
  formatCaracasDate,
  formatCaracasTime24,
  formatDuration,
} from "@/lib/time";
import { paymentDeadline } from "@/modules/scheduler";

/** Nivel visual del aviso: define color e icono en la pantalla del pasajero. */
export type NoticeLevel = "alerta" | "info" | "exito";

export type NoticeKind =
  | "DOCUMENTO_FALTANTE"
  | "RESERVA_POR_LIBERAR"
  | "COMPROBANTE_RECHAZADO"
  | "COMPROBANTE_EN_VALIDACION"
  | "RECONFIRMAR_PAGO_EN_SITIO"
  | "SALDO_PENDIENTE"
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
  /**
   * Lo que falta por pagar, ya formateado ("$ 14,35"). Solo se usa en una
   * reserva pagada en parte; sin él, el aviso de saldo no dice la cifra.
   */
  balance?: string | null;
  latestProof: { status: string; rejectionReason: string | null; createdAt: Date } | null;
}

export interface NoticeInput {
  hasIdDocument: boolean;
  reservations: NoticeReservationInput[];
}

/** Estados finales de una reserva: no ocupan puesto y no generan más avisos. */
const ESTADOS_FINALES = new Set(["LIBERADA", "CANCELADA", "ABORDADA", "NO_SHOW"]);

const NIVEL_ORDEN: Record<NoticeLevel, number> = { alerta: 0, info: 1, exito: 2 };

/**
 * Un plazo o una salida más lejanos que esto no se ponen en tono de alerta:
 * todavía no apuran. Es la misma regla del ticket (`ticketDeadline`).
 */
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

/** Une el símbolo de la moneda con la cifra para que el monto no se parta entre líneas. */
function montoSinCorte(valor: string): string {
  return valor.replace(/^(\$|Bs\.|COP|USDT) +/, "$1 ");
}

function avisosDeReserva(reserva: NoticeReservationInput, now: Date): Notice[] {
  if (reserva.departsAt <= now || ESTADOS_FINALES.has(reserva.status)) return [];

  const avisos: Notice[] = [];
  const href = `/mi/reservas/${reserva.code}`;
  // Cada aviso de una reserva nombra su viaje: el pasajero puede tener varias
  // reservas a la vez y no debe adivinar a cuál se refiere.
  const viaje = `${reserva.origin} → ${reserva.destination}`;

  // El plazo es el mismo que dicen el ticket y el detalle (`paymentDeadline`):
  // nunca después de la salida del bus.
  const plazo = paymentDeadline(reserva, now);

  if (reserva.status === "PENDIENTE_PAGO" && plazo) {
    const restante = etiquetaMinutos(durationMinutes(now, plazo.at));
    avisos.push(
      plazo.boundByDeparture
        ? {
            kind: "RESERVA_POR_LIBERAR",
            level: "alerta",
            title: "Paga antes de que salga tu bus",
            body: `Tu viaje ${viaje} sale ${cuando(
              reserva.departsAt,
              now,
            )}, en ${restante}. Paga antes de esa hora para no perder el viaje.`,
            at: plazo.at,
            href,
            reservationCode: reserva.code,
          }
        : {
            kind: "RESERVA_POR_LIBERAR",
            level: "alerta",
            title: "Paga pronto para no perder tu puesto",
            body: `Te quedan ${restante} para pagar tu viaje ${viaje}. Si no pagas, tu puesto queda libre para otra persona.`,
            at: plazo.at,
            href,
            reservationCode: reserva.code,
          },
    );
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

  // Pagar en la taquilla: se avisa desde que se reserva, con la hora límite
  // exacta. Solo es alerta cuando vence dentro de 24 horas. Si el plazo ya
  // venció, `paymentDeadline` no lo da: el barrido libera el puesto en breve.
  if (reserva.status === "PAGO_EN_SITIO" && plazo) {
    const urgente = durationMinutes(now, plazo.at) <= VEINTICUATRO_HORAS_MIN;
    avisos.push({
      kind: "RECONFIRMAR_PAGO_EN_SITIO",
      level: urgente ? "alerta" : "info",
      title: urgente ? "Paga en la taquilla para no perder tu puesto" : "Recuerda pagar en la taquilla",
      body: `Tu viaje ${viaje} sale ${cuando(
        reserva.departsAt,
        now,
      )}. Tienes hasta ${cuando(plazo.at, now)} para pagar en la taquilla; si no, tu puesto quedará libre.`,
      at: plazo.at,
      href,
      reservationCode: reserva.code,
    });
  }

  // Pagada en parte: el puesto no se pierde, pero sin el ticket no se aborda.
  // Por eso no habla de liberar el puesto, y solo es alerta a menos de 24 horas.
  if (reserva.status === "ABONADA") {
    const urgente = durationMinutes(now, reserva.departsAt) <= VEINTICUATRO_HORAS_MIN;
    const salida = cuando(reserva.departsAt, now);
    avisos.push({
      kind: "SALDO_PENDIENTE",
      level: urgente ? "alerta" : "info",
      title: "Completa tu pago para recibir el ticket",
      body: reserva.balance
        ? `Te faltan ${montoSinCorte(reserva.balance)} para recibir tu ticket del viaje ${viaje}, que sale ${salida}.`
        : `Te falta una parte del pago para recibir tu ticket del viaje ${viaje}, que sale ${salida}.`,
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
