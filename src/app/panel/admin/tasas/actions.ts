"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Currency } from "@prisma/client";
import { requirePanelUser } from "@/modules/auth";
import { setDepartureTax, setExchangeRate } from "@/modules/catalog";
import { toDecimal } from "@/lib/decimal";
import { z } from "zod";
import { panelFeedbackUrl, userFacingMessage } from "@/app/panel/feedback";
import { INVALID_AMOUNT_MESSAGE, parseAmount } from "./amount";

const PAGE_PATH = "/panel/admin/tasas";
const CONFIGURABLE_CURRENCIES: readonly Currency[] = ["VES", "COP"];

/** Código `?ok=` de cada tasa, que la página traduce a texto. */
const OK_CODES: Record<"VES" | "COP", string> = { VES: "tasa-ves", COP: "tasa-cop" };

/** Monto escrito por el administrador, ya normalizado con punto decimal. */
const amountSchema = z
  .string()
  .transform((value, ctx) => {
    const parsed = parseAmount(value);
    if (parsed === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: INVALID_AMOUNT_MESSAGE });
      return z.NEVER;
    }
    return parsed;
  });

/** Guarda la nueva tasa de salida, vigente desde ahora. No altera reservas ya creadas. */
export async function setDepartureTaxAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("terminal.rates");

  const parsed = amountSchema.safeParse(String(formData.get("amountUsd") ?? ""));
  let error: string | null = null;
  if (!parsed.success) {
    error = parsed.error.issues[0]?.message ?? "Revisa el monto.";
  } else {
    try {
      await setDepartureTax({
        amountUsd: toDecimal(parsed.data),
        effectiveFrom: new Date(),
        panelUserId: user.id,
      });
    } catch (caught) {
      error = userFacingMessage(caught);
      if (error === null) throw caught;
    }
  }

  if (error) redirect(panelFeedbackUrl(PAGE_PATH, { error }));

  revalidatePath(PAGE_PATH);
  redirect(panelFeedbackUrl(PAGE_PATH, { ok: "tasa-salida" }));
}

/** Guarda una nueva tasa de cambio (VES o COP), vigente desde ahora. No altera reservas ya creadas. */
export async function setExchangeRateAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("terminal.rates");

  const currencyRaw = String(formData.get("currency") ?? "");
  const parsed = amountSchema.safeParse(String(formData.get("rateFromUsd") ?? ""));

  let error: string | null = null;
  let currency: "VES" | "COP" = "VES";
  if (!CONFIGURABLE_CURRENCIES.includes(currencyRaw as Currency)) {
    error = "Esa moneda no se puede configurar aquí.";
  } else if (!parsed.success) {
    error = parsed.error.issues[0]?.message ?? "Revisa el monto.";
  } else {
    currency = currencyRaw as "VES" | "COP";
    try {
      await setExchangeRate({
        currency,
        rateFromUsd: toDecimal(parsed.data),
        effectiveFrom: new Date(),
        panelUserId: user.id,
      });
    } catch (caught) {
      error = userFacingMessage(caught);
      if (error === null) throw caught;
    }
  }

  if (error) redirect(panelFeedbackUrl(PAGE_PATH, { error }));

  revalidatePath(PAGE_PATH);
  redirect(panelFeedbackUrl(PAGE_PATH, { ok: OK_CODES[currency] }));
}
