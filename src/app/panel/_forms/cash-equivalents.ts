import { Prisma, type Currency } from "@prisma/client";
import { formatMoney } from "@/lib/decimal";

/**
 * Lo que falta por cobrar de una reserva en cada moneda de cobro en efectivo,
 * con la misma regla de conversión del servidor (`paymentAmountUsd` en
 * src/modules/payments/record-payment.ts):
 * - en la moneda de la reserva (bolívares o pesos), la tasa congelada con la
 *   que se hizo;
 * - en otra moneda local, la tasa vigente de hoy;
 * - dólares y USDT, uno a uno.
 *
 * El monto local se redondea hacia arriba al céntimo: así, convertido de
 * vuelta a dólares con `round2(monto / tasa)`, nunca queda un céntimo por
 * debajo del saldo y una reserva que parece pagada no se queda en "Abonada"
 * sin ticket. Módulo puro (sin React ni base de datos) para poder probarlo.
 */

export type LocalCurrency = "VES" | "COP";

export interface CashEquivalent {
  currency: Currency;
  /**
   * Lo que falta por cobrar en esta moneda, en centavos enteros, o `null` si
   * hoy no hay una tasa cargada para ella (no se puede cobrar en esa moneda).
   */
  balanceCents: number | null;
  /** Bolívares o pesos por dólar, como texto decimal; `null` en USD y USDT. */
  rateFromUsd: string | null;
  /** Tasa legible ("1 US$ = Bs. 36,50"); `null` en USD y USDT. */
  rateLabel: string | null;
  /** `true` si la tasa es la congelada de la reserva; `false` si es la vigente de hoy. */
  frozenRate: boolean;
}

/** Orden en que se ofrecen las monedas en el cobro en efectivo. */
export const CASH_CURRENCIES: readonly Currency[] = ["USD", "VES", "COP", "USDT"];

function toCents(value: Prisma.Decimal): number {
  return Number(value.mul(100).toFixed(0));
}

/**
 * Tasa con la que se convierte un cobro en `currency`: la congelada si
 * coincide con la moneda de la reserva, la vigente si no. `null` en dólares o
 * USDT (van uno a uno) y también si falta la tasa vigente.
 */
export function cashRateFor(
  currency: Currency,
  reservation: { currency: Currency; exchangeRateUsed: Prisma.Decimal },
  currentRates: Readonly<Record<LocalCurrency, Prisma.Decimal | null>>,
): { rate: Prisma.Decimal; frozen: boolean } | null {
  if (currency !== "VES" && currency !== "COP") return null;
  if (currency === reservation.currency && !reservation.exchangeRateUsed.isZero()) {
    return { rate: reservation.exchangeRateUsed, frozen: true };
  }
  const vigente = currentRates[currency];
  return vigente && !vigente.isZero() ? { rate: vigente, frozen: false } : null;
}

/** Lo que falta por cobrar en cada moneda, en el orden de `CASH_CURRENCIES`. */
export function cashEquivalents(input: {
  balanceUsd: Prisma.Decimal;
  reservation: { currency: Currency; exchangeRateUsed: Prisma.Decimal };
  currentRates: Readonly<Record<LocalCurrency, Prisma.Decimal | null>>;
}): CashEquivalent[] {
  const saldo = Prisma.Decimal.max(input.balanceUsd, 0);
  return CASH_CURRENCIES.map((currency) => {
    if (currency === "USD" || currency === "USDT") {
      return { currency, balanceCents: toCents(saldo), rateFromUsd: null, rateLabel: null, frozenRate: false };
    }
    const tasa = cashRateFor(currency, input.reservation, input.currentRates);
    if (!tasa) {
      return { currency, balanceCents: null, rateFromUsd: null, rateLabel: null, frozenRate: false };
    }
    const local = saldo.mul(tasa.rate).toDecimalPlaces(2, Prisma.Decimal.ROUND_UP);
    return {
      currency,
      balanceCents: toCents(local),
      rateFromUsd: tasa.rate.toString(),
      rateLabel: `1 US$ = ${formatMoney(tasa.rate, currency)}`,
      frozenRate: tasa.frozen,
    };
  });
}
