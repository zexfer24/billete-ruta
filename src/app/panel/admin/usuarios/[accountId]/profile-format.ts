/**
 * Textos y reglas de presentación del perfil interno de un pasajero. Módulo
 * puro, probado en tests/unit/panel/admin-profile-format.test.ts.
 */

import type { Prisma } from "@prisma/client";
import { formatMoney } from "@/lib/decimal";
import type { StatusTone } from "@/lib/labels";
import { formatCaracasDate, formatCaracasTime24 } from "@/lib/time";
import { countLabel } from "../../_shared/format";

/** Iniciales para el avatar sin foto: la del primer nombre y la del primer apellido. */
export function initialsOf(givenNames: string, surnames: string): string {
  const first = (value: string) => Array.from(value.trim())[0]?.toLocaleUpperCase("es") ?? "";
  return `${first(givenNames)}${first(surnames)}` || "?";
}

/** "1990 (35 años)": el año de nacimiento con la edad que implica. */
export function birthYearText(birthYear: number, age: number): string {
  if (age <= 0) return `${birthYear} (menos de 1 año)`;
  return `${birthYear} (${age} ${age === 1 ? "año" : "años"})`;
}

/** Cómo se dio de alta la cuenta: por su cuenta en la app o en una taquilla. */
export function registrationOriginText(createdVia: "APP" | "TAQUILLA", createdByName: string | null): string {
  if (createdVia === "APP") return "Por su cuenta en la app";
  return createdByName ? `En taquilla por ${createdByName}` : "En taquilla";
}

export interface ProfileBadge {
  label: string;
  tone: StatusTone;
}

/**
 * Pastillas de estado de la cuenta. Una cuenta inactiva lo dice en peligro; una
 * sin contraseña (creada en taquilla y aún sin activar desde `/registro`) lo
 * dice en alerta. Pueden darse las dos a la vez.
 */
export function accountStatusBadges(account: { active: boolean; activated: boolean }): ProfileBadge[] {
  const badges: ProfileBadge[] = [];
  if (!account.active) badges.push({ label: "Cuenta inactiva", tone: "peligro" });
  if (!account.activated) badges.push({ label: "Sin activar · creada en taquilla", tone: "alerta" });
  if (account.active && account.activated) badges.push({ label: "Cuenta activada", tone: "exito" });
  return badges;
}

/** "Ver 1 anterior" o "Ver 3 anteriores", el resumen del plegable de documentos viejos. */
export function previousDocumentsLabel(count: number): string {
  return `Ver ${count} ${count === 1 ? "anterior" : "anteriores"}`;
}

/** Estado de verificación de un documento: "Verificada" en éxito o "Sin verificar" en neutro. */
export function documentStatus(verifiedAt: Date | null): ProfileBadge {
  return verifiedAt ? { label: "Verificada", tone: "exito" } : { label: "Sin verificar", tone: "neutro" };
}

export type PaymentStatusIcon = "check" | "x" | "clock";

export interface PaymentStatusView extends ProfileBadge {
  icon: PaymentStatusIcon;
}

/** Estado de un pago del historial: etiqueta, tono e icono (el color nunca va solo). */
export function paymentStatusView(status: "APROBADO" | "RECHAZADO" | "PENDIENTE" | "COBRADO"): PaymentStatusView {
  switch (status) {
    case "APROBADO":
      return { label: "Aprobado", tone: "exito", icon: "check" };
    case "RECHAZADO":
      return { label: "Rechazado", tone: "peligro", icon: "x" };
    case "COBRADO":
      return { label: "Cobrado", tone: "exito", icon: "check" };
    default:
      return { label: "Pendiente", tone: "alerta", icon: "clock" };
  }
}

/** Tipo de pago en el historial. */
export function paymentKindLabel(kind: "COMPROBANTE" | "EFECTIVO"): string {
  return kind === "COMPROBANTE" ? "Comprobante" : "Efectivo";
}

/** "$ 30,00 de $ 47,50": lo pagado de lo que cuesta la reserva, en dólares. */
export function paidOfTotalText(paidUsd: Prisma.Decimal, totalUsd: Prisma.Decimal): string {
  return `${formatMoney(paidUsd, "USD")} de ${formatMoney(totalUsd, "USD")}`;
}

/** "Caracas → Mérida". */
export function routeText(origin: string, destination: string): string {
  return `${origin} → ${destination}`;
}

/** "1 viaje" o "4 viajes", el conteo de las listas de lo más frecuente. */
export function topCountText(count: number): string {
  return countLabel(count, "viaje", "viajes");
}

/**
 * Hora de 24 horas de Caracas; si cae en otro día que `reference` (una llegada
 * de madrugada, por ejemplo), agrega la fecha. Sin hora, una raya.
 */
export function timeWithDay(date: Date | null, reference: Date): string {
  if (!date) return "—";
  const time = formatCaracasTime24(date);
  const day = formatCaracasDate(date);
  return day === formatCaracasDate(reference) ? time : `${time} · ${day}`;
}
