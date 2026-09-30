import type { AgencyPassengerRow } from "@/modules/reports";
import { maskIdNumber } from "@/lib/identity";
import { formatCaracasDateTime24 } from "@/lib/time";
import { salesChannelLabel } from "@/lib/labels";
import { toDecimal } from "@/lib/decimal";

/**
 * Lista de reservas en CSV para "Descargar en Excel (CSV)". Módulo puro: la
 * ruta `exportar/route.ts` lo usa y los tests lo prueban sin base de datos.
 * La cédula va enmascarada, igual que en la pantalla. Sigue el mismo formato
 * que los CSV de reportes, pensado para abrir con doble clic en el Excel en
 * español de Windows: punto y coma como separador, coma decimal y protección
 * contra fórmulas.
 */

/** Máximo de filas por descarga, el mismo tope que acepta `listAgencyPassengers`. */
export const MAX_CSV_ROWS = 500;

/** Marca de orden de bytes: sin ella Excel abre el archivo con los acentos rotos. */
export const CSV_BOM = "﻿";

/** Separador de campos: el de las listas en la configuración regional en español. */
export const CSV_SEPARATOR = ";";

/**
 * Un campo entre comillas, con las comillas internas duplicadas. Si empieza
 * con `=`, `+`, `-`, `@` o un tabulador se le antepone un apóstrofo, para que
 * Excel no lo ejecute como fórmula: el nombre del titular lo escribe el
 * pasajero al registrarse (inyección de fórmulas en CSV).
 */
function csvField(value: string): string {
  const seguro = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${seguro.replace(/"/g, '""')}"`;
}

/** Monto con dos decimales y coma decimal, sin separador de miles: "1234,50". */
function montoCsv(value: string): string {
  return toDecimal(value).toFixed(2).replace(".", ",");
}

const HEADER = [
  "Código del ticket",
  "Titular",
  "Cédula",
  "Ruta",
  "Salida",
  "Personas",
  "Total USD",
  "Pagado USD",
  "Falta USD",
  "Estado de pago",
  "Canal",
] as const;

/** Arma el CSV con una fila de cabecera y una fila por reserva, separado por punto y coma. */
export function buildPassengersCsv(rows: readonly AgencyPassengerRow[]): string {
  const lines = rows.map((r) =>
    [
      r.code,
      r.holderName,
      maskIdNumber(r.holderIdNumber),
      r.routeName,
      formatCaracasDateTime24(r.departsAt),
      String(r.passengerCount),
      montoCsv(r.totalUsd),
      montoCsv(r.paidUsd),
      montoCsv(r.balanceUsd),
      r.paymentState,
      salesChannelLabel(r.salesChannel),
    ]
      .map(csvField)
      .join(CSV_SEPARATOR),
  );
  return [HEADER.map(csvField).join(CSV_SEPARATOR), ...lines].join("\r\n");
}
