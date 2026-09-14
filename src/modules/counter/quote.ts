import type { Currency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/modules/auth";
import { ValidationError } from "@/modules/booking";
import {
  computeAmounts,
  getCurrentDepartureTax,
  getCurrentExchangeRate,
  missingExchangeRateMessage,
} from "@/modules/catalog";

export interface QuoteCounterSaleInput {
  agencyId: string;
  departureId: string;
  paymentMethodId: string;
  passengerCount: number;
  now?: Date;
}

export interface QuoteCounterSaleResult {
  fareTotalUsd: string;
  taxTotalUsd: string;
  totalUsd: string;
  currency: Currency;
  amountInCurrency: string;
}

/**
 * Cotiza una venta en taquilla sin crear nada, para que la pantalla muestre
 * el total antes de cobrar. La venta (`sellAtCounter`) vuelve a calcular todo
 * dentro de su transacción; esto es solo una vista previa.
 */
export async function quoteCounterSale(
  input: QuoteCounterSaleInput,
): Promise<QuoteCounterSaleResult> {
  const ahora = input.now ?? new Date();
  if (
    !Number.isInteger(input.passengerCount) ||
    input.passengerCount < 1 ||
    input.passengerCount > 6
  ) {
    throw new ValidationError("La cantidad de pasajeros debe estar entre 1 y 6.");
  }

  const salida = await prisma.departure.findUniqueOrThrow({
    where: { id: input.departureId },
    include: { route: true },
  });
  if (salida.route.agencyId !== input.agencyId) {
    throw new ForbiddenError("OPERADOR", "sales.counter");
  }

  const metodo = await prisma.paymentMethod.findUniqueOrThrow({
    where: { id: input.paymentMethodId },
  });
  if (metodo.kind !== "FISICO") {
    throw new ValidationError("La venta en taquilla requiere un método de pago en efectivo.");
  }
  // El método debe ser del terminal (`agencyId: null`) o de la agencia de la
  // salida, y debe seguir activo: la taquilla no ofrece métodos ajenos ni
  // desactivados (ver hallazgo I3 de la ronda 4).
  if (!metodo.active || (metodo.agencyId !== null && metodo.agencyId !== salida.route.agencyId)) {
    throw new ValidationError("Ese método de pago no está disponible.");
  }

  const tasaSalida = await getCurrentDepartureTax(ahora);
  const tasaCambio = await getCurrentExchangeRate(metodo.currency, ahora);
  if ((metodo.currency === "VES" || metodo.currency === "COP") && tasaCambio === null) {
    throw new ValidationError(missingExchangeRateMessage(metodo.currency));
  }

  const montos = computeAmounts({
    fareUsd: salida.route.fareUsd,
    taxPerPassengerUsd: tasaSalida,
    passengerCount: input.passengerCount,
    currency: metodo.currency,
    rateFromUsd: tasaCambio,
  });

  return {
    fareTotalUsd: montos.fareTotalUsd.toString(),
    taxTotalUsd: montos.taxTotalUsd.toString(),
    totalUsd: montos.totalUsd.toString(),
    currency: metodo.currency,
    amountInCurrency: montos.amountInCurrency.toString(),
  };
}
