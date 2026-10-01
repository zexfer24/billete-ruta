import type { Currency } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale/es";
import type { NoticeKind } from "@/modules/notices";
import { BUSINESS_TZ, formatCaracasDate, formatCaracasTime24 } from "@/lib/time";
import { dueForRelease12h, UNPAID_EXPIRY_MINUTES } from "@/modules/scheduler";
import type { PillTone } from "./ui-classes";

/**
 * Textos y reglas puras de la app del pasajero (spec 2026-09-30, sección 7.1):
 * qué dice cada estado, cuál es la acción siguiente, cómo se lee una hora
 * con contexto y cómo se llaman los datos de cobro. Sin JSX ni React, para
 * que lo usen componentes de servidor y de cliente y lo prueben los tests
 * unitarios. Las etiquetas de estado viven en `lib/labels.ts`
 * (`passengerStatusLabel`).
 */

// ---------------------------------------------------------------------------
// Estados de reserva.
// ---------------------------------------------------------------------------

/** Reservas que ya no sirven para viajar: su ticket se muestra apagado. */
const INACTIVE_STATUSES = new Set(["LIBERADA", "CANCELADA", "NO_SHOW"]);

/** La reserva ya no sirve para viajar (puesto liberado, cancelada o no se presentó). */
export function isInactiveReservation(status: string): boolean {
  return INACTIVE_STATUSES.has(status);
}

const PASSENGER_STATUS_TONES: Record<string, PillTone> = {
  PENDIENTE_PAGO: "alerta",
  ABONADA: "alerta",
  EN_VALIDACION: "info",
  PAGO_EN_SITIO: "info",
  PAGADA: "exito",
  ABORDADA: "exito",
  LIBERADA: "neutro",
  CANCELADA: "neutro",
  NO_SHOW: "neutro",
};

/**
 * Tono de la pastilla de estado para el pasajero: ámbar si le falta pagar,
 * azul si espera algo de otro (revisión o taquilla), verde si está listo y
 * neutro si la reserva ya no sirve.
 */
export function passengerStatusTone(status: string): PillTone {
  return PASSENGER_STATUS_TONES[status] ?? "neutro";
}

/**
 * Texto del botón o enlace que lleva a la acción siguiente de una reserva.
 * `balance` es el saldo ya formateado ("$ 20,00").
 */
export function reservationActionLabel(status: string, balance: string): string {
  switch (status) {
    case "PENDIENTE_PAGO":
      return "Pagar mi pasaje";
    case "ABONADA":
      return `Pagar ${balance} que faltan`;
    case "EN_VALIDACION":
      return "Ver el estado de mi pago";
    case "PAGO_EN_SITIO":
      return "Ver cómo pagar en la taquilla";
    case "PAGADA":
      return "Ver mi ticket";
    default:
      return "Ver el detalle";
  }
}

/**
 * Orden de urgencia de una reserva para el pasajero (menor = más urgente):
 * primero lo que se pierde si no paga, luego lo que espera algo de él o de
 * la agencia y al final lo que ya está listo. Sirve para desempatar reservas
 * de una misma salida; nunca sustituye a la hora de salida como primer orden.
 */
const URGENCY_ORDER: Record<string, number> = {
  PENDIENTE_PAGO: 0,
  ABONADA: 1,
  PAGO_EN_SITIO: 2,
  EN_VALIDACION: 3,
  PAGADA: 4,
  ABORDADA: 5,
};

export function reservationUrgency(status: string): number {
  return URGENCY_ORDER[status] ?? 9;
}

/** Frase que explica en qué va el pago de una reserva y qué falta. */
export function paymentPhrase(status: string, balance: string): string {
  switch (status) {
    case "PENDIENTE_PAGO":
    case "ABONADA":
      return `Te faltan ${balance} para recibir tu ticket.`;
    case "EN_VALIDACION":
      return "Estamos revisando tu comprobante. Te avisaremos cuando lo confirmemos.";
    case "PAGO_EN_SITIO":
      return `Paga ${balance} en la taquilla de la agencia para recibir tu ticket.`;
    case "PAGADA":
      return "Tu pasaje está pagado.";
    case "ABORDADA":
      return "Ya hiciste este viaje.";
    case "LIBERADA":
      return "El puesto se liberó porque no se registró el pago a tiempo.";
    case "CANCELADA":
      return "Esta reserva fue cancelada.";
    case "NO_SHOW":
      return "No abordaste este viaje.";
    default:
      return "";
  }
}

/**
 * Estado de un comprobante en palabras del pasajero (spec 7.1: el pasajero
 * tiene su propio lenguaje, separado del panel). `PROOF_STATUS_LABELS` de
 * `lib/labels.ts` sigue siendo la etiqueta del panel.
 */
export const PASSENGER_PROOF_STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "En revisión",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};

// ---------------------------------------------------------------------------
// Plazos de pago.
// ---------------------------------------------------------------------------

/** Lo mínimo de una reserva para saber hasta cuándo puede pagar. */
export interface DeadlineInput {
  status: string;
  departsAt: Date;
  expiresAt: Date | null;
  /** Una reserva de taquilla reconfirmada ya no se libera a las 12 horas. */
  reconfirmedAt?: Date | null;
}

/**
 * Hora límite para pagar una reserva y si esa hora la pone la salida del bus
 * (`boundByDeparture`) en vez de la regla de liberación.
 */
export interface PaymentDeadline {
  at: Date;
  boundByDeparture: boolean;
}

/**
 * Hora límite para pagar en la taquilla: la salida menos el mismo plazo con el
 * que el barrido libera el puesto (`dueForRelease12h`), como el aviso.
 */
export function cashCounterDeadline(departsAt: Date, now: Date): Date {
  const plazoMs = dueForRelease12h(now).getTime() - now.getTime();
  return new Date(departsAt.getTime() - plazoMs);
}

/**
 * Hasta cuándo puede pagar el pasajero sin perder el puesto, o `null` si no
 * corre ningún plazo (ya pagó algo, está en revisión, la reserva no sirve o
 * el plazo ya pasó). Una reserva sin pago vence a las 2 horas de creada, pero
 * nunca después de la salida: si el bus sale antes, el plazo es la salida.
 * No cambia la regla de liberación, solo lo que se le dice al pasajero.
 */
export function paymentDeadline(reserva: DeadlineInput, now: Date): PaymentDeadline | null {
  if (reserva.departsAt <= now) return null;
  if (reserva.status === "PENDIENTE_PAGO") {
    if (!reserva.expiresAt) return null;
    const boundByDeparture = reserva.departsAt < reserva.expiresAt;
    const at = boundByDeparture ? reserva.departsAt : reserva.expiresAt;
    return at > now ? { at, boundByDeparture } : null;
  }
  if (reserva.status === "PAGO_EN_SITIO" && !reserva.reconfirmedAt) {
    const at = cashCounterDeadline(reserva.departsAt, now);
    return at > now ? { at, boundByDeparture: false } : null;
  }
  return null;
}

/**
 * Plazo que tendría una reserva en línea creada ahora para esta salida, para
 * decirlo antes de reservar: 2 horas, o la hora de salida si es antes.
 */
export function estimatedOnlineDeadline(departsAt: Date, now: Date): PaymentDeadline | null {
  return paymentDeadline(
    {
      status: "PENDIENTE_PAGO",
      departsAt,
      expiresAt: new Date(now.getTime() + UNPAID_EXPIRY_MINUTES * 60_000),
    },
    now,
  );
}

/**
 * El plazo en palabras, listo para ir detrás de "hasta" o "antes de": "hoy a
 * las 21:02" o, si lo pone la salida, "hoy a las 20:58, cuando sale el bus".
 */
export function deadlinePhrase(deadline: PaymentDeadline, now: Date = new Date()): string {
  const when = whenPhrase(deadline.at, now);
  return deadline.boundByDeparture ? `${when}, cuando sale el bus` : when;
}

/** Un plazo de taquilla más lejano que esto no se resalta en el ticket: todavía no apura. */
const CARD_CASH_DEADLINE_MS = 24 * 60 * 60 * 1000;

/**
 * Plazo que se resalta en el ticket: siempre el de una reserva sin pago (dura
 * como mucho 2 horas) y el de la taquilla solo si vence dentro de 24 horas,
 * para no poner en tono de alerta algo que falta días para vencer.
 */
export function ticketDeadline(reserva: DeadlineInput, now: Date): PaymentDeadline | null {
  const plazo = paymentDeadline(reserva, now);
  if (!plazo) return null;
  if (reserva.status === "PAGO_EN_SITIO" && plazo.at.getTime() - now.getTime() > CARD_CASH_DEADLINE_MS) {
    return null;
  }
  return plazo;
}

/** Línea del plazo en el ticket: "Paga antes de hoy a las 21:02". */
export function ticketDeadlineLabel(status: string, deadline: PaymentDeadline, now: Date = new Date()): string {
  const cuando = deadlinePhrase(deadline, now);
  return status === "PAGO_EN_SITIO" ? `Paga en la taquilla antes de ${cuando}` : `Paga antes de ${cuando}`;
}

/** Lo mínimo de una reserva próxima para elegir cuál va en grande en el inicio. */
export interface HeroCandidate extends DeadlineInput {
  code: string;
}

/** Un ticket pagado que sale dentro de este plazo siempre va en grande: se usa para abordar. */
const HERO_PAID_KEEP_MS = 3 * 60 * 60 * 1000;

/**
 * Elige la reserva del inicio por la acción que toca, no solo por la hora
 * (spec 7.1, "la próxima acción en grande"):
 *
 * 1. Parte de la salida más cercana; en una misma salida, la más urgente y,
 *    a igual urgencia, la de código menor.
 * 2. Si esa reserva no le pide nada al pasajero (pago en revisión, o pagada
 *    y con más de 3 horas para salir), sube la reserva próxima con el plazo
 *    de pago más cercano, si hay alguna: es la que se pierde si no actúa.
 * 3. Un ticket pagado que sale dentro de 3 horas nunca cede su lugar: es lo
 *    que se muestra al abordar.
 *
 * `soonest` es la de la salida más cercana; `promoted` dice si el héroe es
 * otra por su plazo. `null` si no hay reservas.
 */
export function pickHeroReservation<T extends HeroCandidate>(
  reservas: readonly T[],
  now: Date,
): { hero: T; soonest: T; promoted: boolean } | null {
  const ordenadas = [...reservas].sort(
    (a, b) =>
      a.departsAt.getTime() - b.departsAt.getTime() ||
      reservationUrgency(a.status) - reservationUrgency(b.status) ||
      a.code.localeCompare(b.code),
  );
  const soonest = ordenadas[0];
  if (!soonest) return null;

  const noPideNada =
    soonest.status === "EN_VALIDACION" ||
    (soonest.status === "PAGADA" && soonest.departsAt.getTime() - now.getTime() > HERO_PAID_KEEP_MS);
  if (!noPideNada) return { hero: soonest, soonest, promoted: false };

  let conPlazo: { reserva: T; at: number } | null = null;
  for (const reserva of ordenadas) {
    if (reserva === soonest) continue;
    const plazo = paymentDeadline(reserva, now);
    if (plazo && (!conPlazo || plazo.at.getTime() < conPlazo.at)) {
      conPlazo = { reserva, at: plazo.at.getTime() };
    }
  }
  return conPlazo
    ? { hero: conPlazo.reserva, soonest, promoted: true }
    : { hero: soonest, soonest, promoted: false };
}

// ---------------------------------------------------------------------------
// Horas con contexto.
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Día y hora en palabras, sin artículo, en hora de Caracas y formato de 24
 * horas: "hoy a las 14:30", "mañana a las 08:00", "ayer a las 19:00" o
 * "lun 12 oct a las 08:00". Es el único formato de fecha con hora de la app
 * del pasajero, para que una misma pantalla no mezcle "01/10/2026" con
 * "jueves 1 de octubre".
 */
export function dayTimePhrase(date: Date, now: Date = new Date()): string {
  const day = formatCaracasDate(date);
  const time = formatCaracasTime24(date);
  if (day === formatCaracasDate(now)) return `hoy a las ${time}`;
  if (day === formatCaracasDate(new Date(now.getTime() + DAY_MS))) return `mañana a las ${time}`;
  if (day === formatCaracasDate(new Date(now.getTime() - DAY_MS))) return `ayer a las ${time}`;
  return `${formatInTimeZone(date, BUSINESS_TZ, "EEE d MMM", { locale: es })} a las ${time}`;
}

/**
 * La misma frase lista para ir detrás de un verbo o de "hasta": "hoy a las
 * 14:30", "mañana a las 08:00" o "el lun 12 oct a las 08:00".
 */
export function whenPhrase(date: Date, now: Date = new Date()): string {
  const phrase = dayTimePhrase(date, now);
  return /^(hoy|mañana|ayer) /.test(phrase) ? phrase : `el ${phrase}`;
}

/**
 * Encabezado de un grupo de mensajes por día: "Hoy", "Ayer" o el día en
 * palabras, como en el ticket ("Domingo 27 de septiembre"), con el año solo
 * si no es el actual. Nunca "27/09/2026": una misma lista no mezcla formatos.
 */
export function dayGroupLabel(date: Date, now: Date = new Date()): string {
  const day = formatCaracasDate(date);
  if (day === formatCaracasDate(now)) return "Hoy";
  if (day === formatCaracasDate(new Date(now.getTime() - DAY_MS))) return "Ayer";
  const mismoAno =
    formatInTimeZone(date, BUSINESS_TZ, "yyyy") === formatInTimeZone(now, BUSINESS_TZ, "yyyy");
  return capitalize(
    formatInTimeZone(date, BUSINESS_TZ, mismoAno ? "EEEE d 'de' MMMM" : "EEEE d 'de' MMMM 'de' yyyy", {
      locale: es,
    }),
  );
}

/** Primera letra en mayúscula, para empezar una frase con `whenPhrase`. */
export function capitalize(text: string): string {
  return text.length > 0 ? text[0]!.toUpperCase() + text.slice(1) : text;
}

// ---------------------------------------------------------------------------
// Avisos.
// ---------------------------------------------------------------------------

/**
 * Qué significa la hora de un aviso, en una frase. Los avisos cuyo cuerpo ya
 * dice la hora de salida, o que no dependen de una hora, no la repiten.
 */
export function noticeTimeLabel(notice: { kind: NoticeKind; at: Date }, now: Date = new Date()): string | null {
  switch (notice.kind) {
    case "RESERVA_POR_LIBERAR":
      return `Vence ${whenPhrase(notice.at, now)}`;
    case "COMPROBANTE_RECHAZADO":
    case "COMPROBANTE_EN_VALIDACION":
      return `Lo enviaste ${whenPhrase(notice.at, now)}`;
    default:
      return null;
  }
}

const NOTICE_ACTIONS: Record<NoticeKind, string> = {
  DOCUMENTO_FALTANTE: "Subir la foto",
  RESERVA_POR_LIBERAR: "Pagar ahora",
  COMPROBANTE_RECHAZADO: "Enviar otro comprobante",
  COMPROBANTE_EN_VALIDACION: "Ver mi viaje",
  RECONFIRMAR_PAGO_EN_SITIO: "Ver cómo pagar",
  TICKET_LISTO: "Ver mi ticket",
};

/** Texto de la acción de un aviso que lleva a otra pantalla. */
export function noticeActionLabel(kind: NoticeKind): string {
  return NOTICE_ACTIONS[kind] ?? "Ver más";
}

// ---------------------------------------------------------------------------
// Datos de cobro y monedas.
// ---------------------------------------------------------------------------

const DETAIL_KEY_LABELS: Record<string, string> = {
  banco: "Banco",
  rif: "RIF",
  wallet: "Billetera",
  billetera: "Billetera",
  red: "Red",
  nota: "Nota",
  titular: "Titular",
  correo: "Correo",
  email: "Correo",
  telefono: "Teléfono",
  cedula: "Cédula",
  cuenta: "Número de cuenta",
  tipo: "Tipo de cuenta",
  alias: "Alias",
};

/**
 * Nombre legible de una clave de los datos de cobro de un método de pago
 * ("rif" → "RIF", "wallet" → "Billetera"). Una clave desconocida se muestra
 * con la primera letra en mayúscula y sin guiones.
 */
export function detailLabel(key: string): string {
  const known = DETAIL_KEY_LABELS[key.trim().toLowerCase()];
  if (known) return known;
  return capitalize(key.replace(/[_-]+/g, " ").trim());
}

/** Los datos que se escriben en otra app (cuentas, teléfonos, billeteras) se pueden copiar; las notas no. */
export function isCopyableDetail(key: string): boolean {
  return key.trim().toLowerCase() !== "nota";
}

const CURRENCY_NAMES: Record<Currency, string> = {
  USD: "dólares",
  VES: "bolívares",
  COP: "pesos colombianos",
  USDT: "USDT",
};

/** Nombre de la moneda en minúsculas, para frases como "Pagas en bolívares". */
export function currencyName(currency: Currency): string {
  return CURRENCY_NAMES[currency];
}
