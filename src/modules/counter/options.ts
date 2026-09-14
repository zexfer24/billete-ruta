import type { Currency } from "@prisma/client";
import { getCurrentExchangeRate, listActivePaymentMethods, listBookableDepartures } from "@/modules/catalog";
import type { BookableDeparture } from "@/modules/catalog";

/** Ventana de salidas que se ofrecen para vender en taquilla. */
const COUNTER_WINDOW_DAYS = 7;

export interface CounterPaymentMethod {
  id: string;
  name: string;
  currency: Currency;
  /** Tasa vigente para VES o COP, como string; `null` para USD o USDT. */
  rateFromUsd: string | null;
}

/** Salidas con cupo de la agencia y métodos de pago físicos disponibles para venderlas. */
export async function listCounterOptions(
  agencyId: string,
  now: Date = new Date(),
): Promise<{ departures: BookableDeparture[]; paymentMethods: CounterPaymentMethod[] }> {
  const departures = await listBookableDepartures(
    {
      agencyId,
      onlyWithSeats: true,
      to: new Date(now.getTime() + COUNTER_WINDOW_DAYS * 24 * 3_600_000),
    },
    now,
  );

  // `listActivePaymentMethods` ya ordena por `sortOrder`; aquí solo se filtran los físicos.
  const fisicos = (await listActivePaymentMethods(agencyId)).filter((m) => m.kind === "FISICO");

  const conTasa = await Promise.all(
    fisicos.map(async (metodo) => ({
      metodo,
      rateFromUsd: await getCurrentExchangeRate(metodo.currency, now),
    })),
  );

  // Un método físico en VES o COP sin tasa vigente rompería la cotización
  // (ver `quoteCounterSale`, hallazgo I2 de la ronda 4): el asistente de
  // taquilla no debe ofrecerlo.
  const paymentMethods: CounterPaymentMethod[] = conTasa
    .filter(
      ({ metodo, rateFromUsd }) =>
        metodo.currency === "USD" || metodo.currency === "USDT" || rateFromUsd !== null,
    )
    .map(({ metodo, rateFromUsd }) => ({
      id: metodo.id,
      name: metodo.name,
      currency: metodo.currency,
      rateFromUsd: rateFromUsd?.toString() ?? null,
    }));

  return { departures, paymentMethods };
}
