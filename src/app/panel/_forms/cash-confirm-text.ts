/**
 * Textos de la confirmación de un cobro en efectivo (principio 6 de la spec:
 * una acción de dinero se confirma con sus consecuencias en números). Módulo
 * puro, sin React, para poder probarlo. Los montos se manejan en centavos
 * enteros (nunca con decimales de coma flotante) y solo para mostrarlos: el
 * cálculo que vale es el del servidor.
 */

export type CashCurrency = "USD" | "VES" | "COP" | "USDT";

const PREFIJOS: Record<CashCurrency, string> = {
  USD: "$ ",
  VES: "Bs. ",
  COP: "COP ",
  USDT: "USDT ",
};

/** Hasta nueve cifras enteras: en centavos sigue siendo un entero exacto. */
const MONTO = /^(\d{1,9})(?:\.(\d{1,2}))?$/;

/**
 * Monto escrito por el operador ("41", "41,5", "41.50") en centavos, o `null`
 * si no es un monto claro mayor que cero con hasta dos decimales. Acepta coma
 * o punto para los céntimos, igual que el servidor.
 */
export function amountToCents(raw: string): number | null {
  const cents = decimalToCents(raw);
  return cents !== null && cents > 0 ? cents : null;
}

/** Monto decimal ("41", "41.5", "0") en centavos, o `null` si no se entiende. */
export function decimalToCents(raw: string): number | null {
  const match = MONTO.exec(raw.trim().replace(",", "."));
  if (!match) return null;
  const [, entera = "0", decimales = ""] = match;
  return Number(entera) * 100 + Number(decimales.padEnd(2, "0"));
}

/** Centavos con separador de miles y coma decimal: "$ 1.041,50", "Bs. 36,00". */
export function formatCents(cents: number, currency: CashCurrency): string {
  const entera = Math.floor(cents / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimales = (cents % 100).toString().padStart(2, "0");
  return `${PREFIJOS[currency]}${entera},${decimales}`;
}

export interface CashConfirmText {
  /** Qué se va a registrar y a nombre de quién. */
  lead: string;
  /** Cómo queda la reserva después del cobro. */
  outcome: string;
  /** Advertencia destacada si el monto supera el saldo, o `null`. */
  excess: string | null;
}

/**
 * Frases del diálogo de confirmación. En dólares o USDT (uno a uno) se da el
 * saldo que queda; en bolívares o pesos la conversión la hace el servidor con
 * la tasa que corresponde, así que no se inventa una cifra.
 */
export function cashConfirmText(input: {
  amountCents: number;
  currency: CashCurrency;
  balanceCents: number;
  holderName?: string;
}): CashConfirmText {
  const { amountCents, currency, balanceCents, holderName } = input;
  const lead = `Registrarás ${formatCents(amountCents, currency)} en efectivo${
    holderName ? ` a nombre de ${holderName}` : ""
  }. Un cobro registrado no se puede borrar.`;

  if (currency === "VES" || currency === "COP") {
    return {
      lead,
      outcome: `Se convierte a dólares con la tasa que corresponde y se descuenta de lo que falta por cobrar, ${formatCents(balanceCents, "USD")}.`,
      excess: null,
    };
  }

  const resta = balanceCents - amountCents;
  if (resta > 0) {
    return { lead, outcome: `Quedará un saldo de ${formatCents(resta, "USD")} por cobrar.`, excess: null };
  }
  return {
    lead,
    outcome: "La reserva quedará pagada y se emitirá el ticket.",
    excess:
      resta < 0
        ? `Supera lo que falta por cobrar en ${formatCents(-resta, "USD")}. El excedente también quedará registrado.`
        : null,
  };
}
