"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Currency } from "@prisma/client";
import { requirePanelUser } from "@/modules/auth";
import { setDepartureTax, setExchangeRate } from "@/modules/catalog";
import { toDecimal } from "@/lib/decimal";

const PAGE_PATH = "/panel/admin/tasas";
const CONFIGURABLE_CURRENCIES: readonly Currency[] = ["VES", "COP"];

function redirectWithError(message: string): never {
  redirect(`${PAGE_PATH}?error=${encodeURIComponent(message)}`);
}

const amountSchema = z
  .string()
  .transform((v) => v.trim().replace(",", "."))
  .refine((v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0;
  }, "Ingresa un monto numérico mayor a cero.");

/** Carga la nueva tasa de salida vigente desde ahora. No altera reservas ya creadas. */
export async function setDepartureTaxAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("terminal.rates");

  const parsed = amountSchema.safeParse(String(formData.get("amountUsd") ?? ""));
  if (!parsed.success) redirectWithError(parsed.error.issues[0]?.message ?? "Monto inválido.");

  await setDepartureTax({
    amountUsd: toDecimal(parsed.data),
    effectiveFrom: new Date(),
    panelUserId: user.id,
  });

  revalidatePath(PAGE_PATH);
  redirect(`${PAGE_PATH}?ok=1`);
}

/** Carga una nueva tasa de cambio (VES o COP) vigente desde ahora. No altera reservas ya creadas. */
export async function setExchangeRateAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("terminal.rates");

  const currencyRaw = String(formData.get("currency") ?? "");
  if (!CONFIGURABLE_CURRENCIES.includes(currencyRaw as Currency)) {
    redirectWithError("Moneda no válida.");
  }
  const currency = currencyRaw as Currency;

  const parsed = amountSchema.safeParse(String(formData.get("rateFromUsd") ?? ""));
  if (!parsed.success) redirectWithError(parsed.error.issues[0]?.message ?? "Monto inválido.");

  await setExchangeRate({
    currency,
    rateFromUsd: toDecimal(parsed.data),
    effectiveFrom: new Date(),
    panelUserId: user.id,
  });

  revalidatePath(PAGE_PATH);
  redirect(`${PAGE_PATH}?ok=1`);
}
