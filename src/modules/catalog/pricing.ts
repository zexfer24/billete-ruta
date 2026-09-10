import type { Currency, ReservationStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { round2, toDecimal } from "@/lib/decimal";

/** Monedas que no requieren tasa de cambio porque se cotizan a la par del dólar. */
const NO_RATE_CURRENCIES: readonly Currency[] = ["USD", "USDT"];

export interface ComputeAmountsInput {
  fareUsd: Prisma.Decimal;
  taxPerPassengerUsd: Prisma.Decimal;
  passengerCount: number;
  currency: Currency;
  rateFromUsd: Prisma.Decimal | null;
}

export interface ComputedAmounts {
  fareTotalUsd: Prisma.Decimal;
  taxTotalUsd: Prisma.Decimal;
  totalUsd: Prisma.Decimal;
  amountInCurrency: Prisma.Decimal;
  exchangeRateUsed: Prisma.Decimal;
}

/**
 * La tarifa es ingreso de la agencia y la tasa de salida es ingreso del terminal,
 * por eso se calculan y se guardan por separado.
 */
export function computeAmounts({
  fareUsd,
  taxPerPassengerUsd,
  passengerCount,
  currency,
  rateFromUsd,
}: ComputeAmountsInput): ComputedAmounts {
  if (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 6) {
    throw new Error("La cantidad de pasajeros debe estar entre 1 y 6");
  }
  const fareTotalUsd = round2(fareUsd.mul(passengerCount));
  const taxTotalUsd = round2(taxPerPassengerUsd.mul(passengerCount));
  const totalUsd = round2(fareTotalUsd.add(taxTotalUsd));

  if (NO_RATE_CURRENCIES.includes(currency)) {
    return {
      fareTotalUsd,
      taxTotalUsd,
      totalUsd,
      amountInCurrency: totalUsd,
      exchangeRateUsed: toDecimal(1),
    };
  }
  if (rateFromUsd === null) {
    throw new Error(`No hay tasa vigente para ${currency}`);
  }
  return {
    fareTotalUsd,
    taxTotalUsd,
    totalUsd,
    amountInCurrency: round2(totalUsd.mul(rateFromUsd)),
    exchangeRateUsed: rateFromUsd,
  };
}

/** Saldo pendiente. Nunca es negativo: un pago en exceso deja saldo cero. */
export function balanceUsd(
  totalUsd: Prisma.Decimal,
  paidUsd: Prisma.Decimal,
): Prisma.Decimal {
  const saldo = round2(totalUsd.sub(paidUsd));
  return saldo.isNegative() ? toDecimal(0) : saldo;
}

/**
 * Estado que corresponde tras registrar un pago aprobado.
 * Nunca devuelve un estado al que no se pueda transicionar desde el actual.
 */
export function statusAfterPayment(
  current: ReservationStatus,
  totalUsd: Prisma.Decimal,
  paidUsd: Prisma.Decimal,
): ReservationStatus {
  const saldado = balanceUsd(totalUsd, paidUsd).isZero();
  if (saldado) return "PAGADA";
  if (current === "PAGO_EN_SITIO") return "PAGO_EN_SITIO";
  return "ABONADA";
}

/** Convierte un monto declarado en otra moneda a dólares usando la tasa de la reserva. */
export function toUsd(
  amount: Prisma.Decimal,
  currency: Currency,
  exchangeRateUsed: Prisma.Decimal,
): Prisma.Decimal {
  if (NO_RATE_CURRENCIES.includes(currency)) return round2(amount);
  if (exchangeRateUsed.isZero()) {
    throw new Error("La tasa de cambio de la reserva no puede ser cero");
  }
  return round2(amount.div(exchangeRateUsed));
}
