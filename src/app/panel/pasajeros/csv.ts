import type { AgencyPassengerRow } from "@/modules/reports";
import { maskIdNumber } from "@/lib/identity";
import { formatCaracasDateTime24 } from "@/lib/time";
import { salesChannelLabel } from "@/lib/labels";

/**
 * Lista de reservas en CSV para "Descargar en Excel (CSV)". Módulo puro: la
 * ruta `exportar/route.ts` lo usa y los tests lo prueban sin base de datos.
 * La cédula va enmascarada, igual que en la pantalla.
 */

/** Máximo de filas por descarga, el mismo tope que acepta `listAgencyPassengers`. */
export const MAX_CSV_ROWS = 500;

/** Marca de orden de bytes: sin ella Excel abre el archivo con los acentos rotos. */
export const CSV_BOM = "﻿";

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
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

/** Arma el CSV con una fila de cabecera y una fila por reserva, separado por comas. */
export function buildPassengersCsv(rows: readonly AgencyPassengerRow[]): string {
  const lines = rows.map((r) =>
    [
      r.code,
      r.holderName,
      maskIdNumber(r.holderIdNumber),
      r.routeName,
      formatCaracasDateTime24(r.departsAt),
      String(r.passengerCount),
      r.totalUsd,
      r.paidUsd,
      r.balanceUsd,
      r.paymentState,
      salesChannelLabel(r.salesChannel),
    ]
      .map(csvField)
      .join(","),
  );
  return [HEADER.map(csvField).join(","), ...lines].join("\r\n");
}
