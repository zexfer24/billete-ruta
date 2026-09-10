import { Prisma } from "@prisma/client";
import type { Currency } from "@prisma/client";

/** Convierte cualquier representación de un monto en Decimal exacto. */
export function toDecimal(value: string | number | Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

/** Redondeo a dos decimales con criterio comercial (medio hacia arriba). */
export function round2(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

const PREFIJOS: Record<Currency, string> = {
  USD: "$ ",
  VES: "Bs. ",
  COP: "COP ",
  USDT: "USDT ",
};

/** Formatea un monto con separador de miles y coma decimal, como se usa en Venezuela. */
export function formatMoney(value: Prisma.Decimal, currency: Currency): string {
  const [entera = "0", decimal = "00"] = round2(value).toFixed(2).split(".");
  const conMiles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${PREFIJOS[currency]}${conMiles},${decimal}`;
}

export const ZERO = new Prisma.Decimal(0);
