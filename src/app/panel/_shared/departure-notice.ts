import { formatRelativeDeparture, minutesUntil } from "@/lib/time";
import { departureWhenText } from "./day-label";

/**
 * Aviso de tiempo de una salida que todavía no partió, compartido por la
 * lista de salidas (tarjeta y fila) y la hoja de la salida:
 * - `atrasada`: su hora ya pasó y sigue programada o con el embarque abierto.
 *   Misma regla y mismas palabras que el tablero ("Debía salir a las 13:00").
 *   Nunca usa `formatRelativeDeparture`, que diría "Salió" de un bus que no
 *   ha salido.
 * - `pronto`: sale dentro de la próxima hora ("Sale en 15 min", "Sale ahora").
 * Las dos van en tono de alerta, igual que en el tablero.
 */
export interface DepartureNotice {
  kind: "atrasada" | "pronto";
  text: string;
}

export function departureNotice(
  departure: { status: string; departsAt: Date },
  now: Date,
): DepartureNotice | null {
  if (departure.status !== "PROGRAMADA" && departure.status !== "MANIFIESTO_CERRADO") return null;

  if (departure.departsAt.getTime() < now.getTime()) {
    // "hoy a las 13:00" se dice solo "a las 13:00"; otro día conserva el día.
    const cuando = departureWhenText(departure.departsAt, now).replace(/^hoy /, "");
    return {
      kind: "atrasada",
      text:
        departure.status === "MANIFIESTO_CERRADO"
          ? `Embarque abierto · debía salir ${cuando}`
          : `Debía salir ${cuando}`,
    };
  }

  if (minutesUntil(departure.departsAt, now) < 60) {
    return { kind: "pronto", text: formatRelativeDeparture(departure.departsAt, now) };
  }
  return null;
}

/** Espacio de no separación (U+00A0). */
const NBSP = String.fromCharCode(0xa0);

/**
 * El mismo texto con la hora pegada a sus palabras ("a las 21:00", "en 15
 * min") mediante espacios de no separación: en una columna angosta se parte
 * "Debía salir / a las 21:00", nunca "Debía salir a las / 21:00".
 */
export function noticeTextNoBreak(text: string): string {
  return text
    .replace(/a las (\d{1,2}:\d{2})/g, `a${NBSP}las${NBSP}$1`)
    .replace(/en (\d+) min/g, `en${NBSP}$1${NBSP}min`);
}
