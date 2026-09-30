import { z } from "zod";
import { formatCaracasDateTime24, formatDuration } from "@/lib/time";
import type { AgencyMovementRow } from "@/modules/reports";
import { periodParamsSchema, periodQuery, withQuery, type AdminRange } from "../_shared/period";

/**
 * Reglas puras de la pantalla de movimientos del administrador: parámetros de
 * la URL, enlaces, estado del viaje y archivo CSV. Probadas en
 * tests/unit/panel/admin-movements.test.ts.
 */

export const MOVEMENTS_PATH = "/panel/admin/movimientos";

/** Parámetros de la URL. Nunca lanza: una agencia o un viaje que no son UUID se ignoran. */
export const movementsParamsSchema = periodParamsSchema.extend({
  agency: z.string().uuid().optional().catch(undefined),
  viaje: z.string().uuid().optional().catch(undefined),
});

export type MovementsParams = z.infer<typeof movementsParamsSchema>;

/** Lee los parámetros de la URL; ante cualquier forma inesperada devuelve los valores por defecto. */
export function parseMovementsParams(raw: unknown): MovementsParams {
  const parsed = movementsParamsSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}

/** Enlace a la lista con el periodo y la agencia aplicados, y opcionalmente un viaje abierto. */
export function movementsHref(range: AdminRange, agencyId: string | undefined, viaje?: string): string {
  return withQuery(MOVEMENTS_PATH, { ...periodQuery(range), agency: agencyId, viaje });
}

/** Enlace de descarga del CSV con los mismos filtros de la pantalla. */
export function movementsCsvHref(range: AdminRange, agencyId: string | undefined): string {
  return withQuery(`${MOVEMENTS_PATH}/descargar`, { ...periodQuery(range), agency: agencyId });
}

/**
 * Estado de un viaje según lo que registró la agencia, con las mismas claves
 * de `DEPARTURE_STATUS_LABELS`: embarcando, en ruta o finalizada.
 */
export function tripStatus(trip: {
  departedAt: Date | null;
  arrivedAt: Date | null;
}): "MANIFIESTO_CERRADO" | "EN_RUTA" | "FINALIZADA" {
  if (trip.arrivedAt) return "FINALIZADA";
  if (trip.departedAt) return "EN_RUTA";
  return "MANIFIESTO_CERRADO";
}

/** Separador de columnas: punto y coma, el que Excel espera en español (la coma es el decimal). */
const CSV_SEPARATOR = ";";

/**
 * Una celda del CSV: entre comillas si lleva separador, comillas o saltos de
 * línea, y con un apóstrofo delante si empieza como una fórmula (=, +, -, @),
 * para que la hoja de cálculo no la ejecute.
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\n\r,]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const CSV_HEADERS = [
  "Agencia",
  "Ruta",
  "Origen",
  "Destino",
  "Chofer",
  "Unidad",
  "Hora de embarque",
  "Hora de salida",
  "Hora de llegada",
  "Duración",
  "Pasajeros",
];

/** Archivo CSV de movimientos, con marca UTF-8 al inicio para que Excel muestre bien los acentos. */
export function movementsCsv(rows: AgencyMovementRow[]): string {
  const lines = [
    CSV_HEADERS,
    ...rows.map((m) => [
      m.agencyName,
      m.routeName,
      m.origin,
      m.destination,
      m.driverName,
      m.vehiclePlate,
      m.boardingStartedAt ? formatCaracasDateTime24(m.boardingStartedAt) : "",
      m.departedAt ? formatCaracasDateTime24(m.departedAt) : "",
      m.arrivedAt ? formatCaracasDateTime24(m.arrivedAt) : "",
      m.durationMinutes !== null ? formatDuration(m.durationMinutes) : "",
      String(m.passengerCount),
    ]),
  ];
  return `\uFEFF${lines.map((line) => line.map(csvCell).join(CSV_SEPARATOR)).join("\r\n")}\r\n`;
}
