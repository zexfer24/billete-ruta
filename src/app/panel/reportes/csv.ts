import type { Prisma } from "@prisma/client";
import type { DriverMovementRow, RouteRevenueRow } from "@/modules/reports";
import { caracasDayInputValue, formatCaracasDate, formatCaracasTime24 } from "@/lib/time";
import type { ReportRange, ReportView } from "./range";

/**
 * Archivos CSV de los reportes, pensados para abrirse con doble clic en el
 * Excel en español de Windows: marca BOM UTF-8 (para que se vean bien los
 * acentos y la ñ), punto y coma como separador y coma decimal. Funciones
 * puras, sin base de datos.
 */

/** Marca de orden de bytes UTF-8: le dice a Excel que el archivo está en UTF-8. */
export const CSV_BOM = "﻿";

/**
 * Un campo entre comillas, con las comillas internas duplicadas. Si empieza
 * con `=`, `+`, `-`, `@` o un tabulador se le antepone un apóstrofo, para que
 * Excel no lo interprete como fórmula (inyección de fórmulas en CSV).
 */
export function csvField(value: string): string {
  const seguro = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${seguro.replace(/"/g, '""')}"`;
}

/** Arma el CSV completo: BOM, filas separadas por CRLF y campos por punto y coma. */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<string>>): string {
  return `${CSV_BOM}${rows.map((row) => row.map(csvField).join(";")).join("\r\n")}\r\n`;
}

/** Monto con dos decimales y coma decimal, sin separador de miles: "1234,50". */
function montoCsv(value: Prisma.Decimal): string {
  return value.toFixed(2).replace(".", ",");
}

/** Recaudación por ruta en el rango. */
export function revenueCsv(filas: readonly RouteRevenueRow[]): string {
  return toCsv([
    ["Ruta", "Origen", "Destino", "Recaudado (USD)", "Pagos"],
    ...filas.map((f) => [f.routeName, f.origin, f.destination, montoCsv(f.totalUsd), String(f.payments)]),
  ]);
}

function fecha(date: Date | null): string {
  return date ? formatCaracasDate(date) : "";
}

function hora(date: Date | null): string {
  return date ? formatCaracasTime24(date) : "";
}

/** Viajes de los choferes en el rango, con fecha y hora por separado para poder ordenar. */
export function movementsCsv(movimientos: readonly DriverMovementRow[]): string {
  return toCsv([
    [
      "Chofer",
      "Cédula del chofer",
      "Vehículo",
      "Ruta",
      "Fecha de salida",
      "Inicio del embarque",
      "Hora de salida",
      "Fecha de llegada",
      "Hora de llegada",
      "Duración (minutos)",
      "Pasajeros",
    ],
    ...movimientos.map((m) => [
      m.driverName,
      m.driverIdNumber,
      m.vehiclePlate,
      m.routeName,
      fecha(m.departedAt ?? m.boardingStartedAt),
      hora(m.boardingStartedAt),
      hora(m.departedAt),
      fecha(m.arrivedAt),
      hora(m.arrivedAt),
      m.durationMinutes !== null ? String(m.durationMinutes) : "",
      String(m.passengerCount),
    ]),
  ]);
}

/** Nombre del archivo con la vista y el rango: "recaudacion_2026-09-24_al_2026-09-30.csv". */
export function reportFileName(vista: ReportView, range: ReportRange): string {
  const base = vista === "recaudacion" ? "recaudacion" : "viajes-de-choferes";
  const desde = caracasDayInputValue(range.from);
  const hasta = caracasDayInputValue(range.to);
  return desde === hasta ? `${base}_${desde}.csv` : `${base}_${desde}_al_${hasta}.csv`;
}
