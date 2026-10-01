import type { Prisma } from "@prisma/client";
import { computeAmounts } from "@/modules/catalog";

/** Precio de un pasaje para una persona, en dólares, como texto para el cliente. */
export interface PerPassengerPrice {
  /** Tasa del terminal por persona. */
  taxUsd: string;
  /** Tarifa de la agencia más la tasa del terminal: lo que se le dice al pasajero en el mostrador. */
  totalUsd: string;
}

/**
 * Precio final por persona de una salida, con la tasa del terminal incluida.
 * Lo calcula el dominio (`computeAmounts`), no una suma en el cliente, para que
 * coincida al céntimo con el cobro del paso 4.
 */
export function perPassengerPrice(fareUsd: Prisma.Decimal, taxPerPassengerUsd: Prisma.Decimal): PerPassengerPrice {
  const montos = computeAmounts({
    fareUsd,
    taxPerPassengerUsd,
    passengerCount: 1,
    currency: "USD",
    rateFromUsd: null,
  });
  return { taxUsd: montos.taxTotalUsd.toString(), totalUsd: montos.totalUsd.toString() };
}
