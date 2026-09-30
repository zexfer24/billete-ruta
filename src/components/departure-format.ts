import { formatCaracas, formatCaracasDate, formatRelativeDeparture, minutesUntil } from "@/lib/time";

/**
 * Reglas puras de presentación de una salida, compartidas por el tablero de
 * la portada (`DepartureBoard`) y la fila de salida (`DepartureRow`). Sin JSX
 * ni dependencias de servidor: se pueden usar desde componentes de cliente y
 * probar en los tests unitarios sin montar nada.
 */

/** Por debajo de estos minutos la salida se rotula con "Sale en N min". */
export const URGENT_DEPARTURE_MINUTES = 60;

/** Con esta cantidad de puestos o menos se avisa "Quedan N puestos". */
export const LOW_SEATS_THRESHOLD = 3;

/** Nivel de disponibilidad, para elegir el tono del texto de puestos. */
export type SeatsLevel = "agotado" | "pocos" | "normal";

export function seatsLevel(available: number): SeatsLevel {
  if (available <= 0) return "agotado";
  if (available <= LOW_SEATS_THRESHOLD) return "pocos";
  return "normal";
}

/**
 * Puestos libres en singular o plural, sin paréntesis (spec 1.2 y 8):
 * "Sin puestos", "Queda 1 puesto", "Quedan 3 puestos", "12 puestos".
 */
export function seatsLabel(available: number): string {
  const nivel = seatsLevel(available);
  if (nivel === "agotado") return "Sin puestos";
  if (available === 1) return "Queda 1 puesto";
  if (nivel === "pocos") return `Quedan ${available} puestos`;
  return `${available} puestos`;
}

/**
 * Tarifa en dólares recibida como texto (ya serializada desde un Decimal),
 * con coma decimal y separador de miles: "$ 1.234,50". Solo presenta: nunca
 * se usa para calcular.
 */
export function formatFareUsd(fare: string): string {
  const valor = Number(fare);
  if (!Number.isFinite(valor)) return `$ ${fare}`;
  const texto = new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
  return `$ ${texto}`;
}

/**
 * Rótulo de urgencia de una salida: "Sale ahora" o "Sale en 15 min" cuando
 * falta menos de una hora (o "Salió" si ya pasó). Si falta más, devuelve
 * `null`: la hora ya se muestra en grande y repetirla sería ruido.
 */
export function departureUrgencyLabel(departsAt: Date, now: Date): string | null {
  if (minutesUntil(departsAt, now) >= URGENT_DEPARTURE_MINUTES) return null;
  return formatRelativeDeparture(departsAt, now);
}

/**
 * Día de la salida cuando no es hoy (hora de Caracas): "Mañana" o "02/10".
 * Hoy devuelve `null`, porque basta con la hora.
 */
export function departureDayLabel(departsAt: Date, now: Date): string | null {
  const dia = formatCaracasDate(departsAt);
  if (dia === formatCaracasDate(now)) return null;
  const manana = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (dia === formatCaracasDate(manana)) return "Mañana";
  return formatCaracas(departsAt, "dd/MM");
}
