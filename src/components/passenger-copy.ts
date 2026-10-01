import type { Currency } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale/es";
import type { NoticeKind } from "@/modules/notices";
import { BUSINESS_TZ, formatCaracasDate, formatCaracasTime24 } from "@/lib/time";
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
