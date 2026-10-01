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

/**
 * Espacio de no separación (U+00A0) entre el prefijo de la moneda y la cifra:
 * así un monto nunca se parte entre dos líneas ("$" al final de una y
 * "1.234,50" al principio de la siguiente) en tablas o tarjetas angostas.
 */
export const MONEY_SPACE = "\u00A0";

const PREFIJOS: Record<Currency, string> = {
  USD: `$${MONEY_SPACE}`,
  VES: `Bs.${MONEY_SPACE}`,
  COP: `COP${MONEY_SPACE}`,
  USDT: `USDT${MONEY_SPACE}`,
};

/**
 * Formatea un monto con separador de miles y coma decimal, como se usa en
 * Venezuela, con el prefijo pegado a la cifra (`MONEY_SPACE`). Es para mostrar
 * en pantalla, mensajes y PDF; un CSV debe escribir la cifra sin formato.
 */
export function formatMoney(value: Prisma.Decimal, currency: Currency): string {
  const [entera = "0", decimal = "00"] = round2(value).toFixed(2).split(".");
  const conMiles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${PREFIJOS[currency]}${conMiles},${decimal}`;
}

/**
 * Formatea un monto en USD recibido como `string` desde el cliente (por ejemplo,
 * los montos de un ticket ya serializados), con coma decimal y separador de miles
 * como en el resto de la app. Para montos en servidor con `Prisma.Decimal`, usa
 * `formatMoney`.
 */
export function formatUsdString(value: string): string {
  const formateado = new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
  return `$${MONEY_SPACE}${formateado}`;
}

export const ZERO = new Prisma.Decimal(0);
