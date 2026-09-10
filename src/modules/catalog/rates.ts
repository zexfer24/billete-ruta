import type { Currency, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/modules/audit";

/** Tasa de cambio vigente en un instante dado, o null si nunca se cargó una. */
export async function getCurrentExchangeRate(
  currency: Currency,
  at: Date = new Date(),
  tx: Prisma.TransactionClient = prisma,
): Promise<Prisma.Decimal | null> {
  if (currency === "USD" || currency === "USDT") return null;
  const fila = await tx.exchangeRate.findFirst({
    where: { currency, effectiveFrom: { lte: at } },
    orderBy: { effectiveFrom: "desc" },
  });
  return fila?.rateFromUsd ?? null;
}

/** Tasa de salida que cobra el terminal por pasajero. */
export async function getCurrentDepartureTax(
  at: Date = new Date(),
  tx: Prisma.TransactionClient = prisma,
): Promise<Prisma.Decimal> {
  const fila = await tx.departureTax.findFirst({
    where: { effectiveFrom: { lte: at } },
    orderBy: { effectiveFrom: "desc" },
  });
  if (!fila) {
    throw new Error("No hay tasa de salida configurada. El administrador debe cargarla.");
  }
  return fila.amountUsd;
}

export async function setExchangeRate(input: {
  currency: Currency;
  rateFromUsd: Prisma.Decimal | string;
  effectiveFrom: Date;
  panelUserId: string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const fila = await tx.exchangeRate.create({
      data: {
        currency: input.currency,
        rateFromUsd: input.rateFromUsd,
        effectiveFrom: input.effectiveFrom,
        createdByPanelUserId: input.panelUserId,
      },
    });
    await writeAudit(tx, {
      actorType: "PANEL",
      actorPanelUserId: input.panelUserId,
      entityType: "ExchangeRate",
      entityId: fila.id,
      action: "TASA_CAMBIO_CARGADA",
      after: {
        currency: input.currency,
        rateFromUsd: String(input.rateFromUsd),
        effectiveFrom: input.effectiveFrom.toISOString(),
      },
    });
  });
}

export async function setDepartureTax(input: {
  amountUsd: Prisma.Decimal | string;
  effectiveFrom: Date;
  panelUserId: string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const fila = await tx.departureTax.create({
      data: {
        amountUsd: input.amountUsd,
        effectiveFrom: input.effectiveFrom,
        createdByPanelUserId: input.panelUserId,
      },
    });
    await writeAudit(tx, {
      actorType: "PANEL",
      actorPanelUserId: input.panelUserId,
      entityType: "DepartureTax",
      entityId: fila.id,
      action: "TASA_SALIDA_CARGADA",
      after: {
        amountUsd: String(input.amountUsd),
        effectiveFrom: input.effectiveFrom.toISOString(),
      },
    });
  });
}

export async function listExchangeRates(currency?: Currency) {
  return prisma.exchangeRate.findMany({
    where: currency ? { currency } : undefined,
    orderBy: { effectiveFrom: "desc" },
    take: 50,
  });
}

export async function listDepartureTaxes() {
  return prisma.departureTax.findMany({ orderBy: { effectiveFrom: "desc" }, take: 50 });
}
