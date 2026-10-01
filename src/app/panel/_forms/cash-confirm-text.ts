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
 * Lo que falta por cobrar en bolívares o pesos y la tasa con la que el
 * servidor convertirá el cobro (ver `cash-equivalents.ts`).
 */
export interface LocalBalance {
  /** Saldo en la moneda elegida, en centavos, redondeado hacia arriba. */
  balanceCents: number;
  /** Bolívares o pesos por dólar. Solo para mostrar: la cuenta que vale es la del servidor. */
  rateFromUsd: number;
  /** Tasa legible: "1 US$ = Bs. 36,50". */
  rateLabel: string;
}

/**
 * Frases del diálogo de confirmación. En dólares o USDT (uno a uno) se da el
 * saldo que queda en dólares. En bolívares o pesos, con `local`, se da en esa
 * moneda y con la tasa que se usará, igual que el servidor: el monto se pasa
 * a dólares con redondeo al céntimo y se compara con el saldo en dólares. Sin
 * `local` no se inventa una cifra.
 */
export function cashConfirmText(input: {
  amountCents: number;
  currency: CashCurrency;
  balanceCents: number;
  holderName?: string;
  local?: LocalBalance;
}): CashConfirmText {
  const { amountCents, currency, balanceCents, holderName, local } = input;
  const lead = `Registrarás ${formatCents(amountCents, currency)} en efectivo${
    holderName ? ` a nombre de ${holderName}` : ""
  }. Un cobro registrado no se puede borrar.`;

  if (currency === "VES" || currency === "COP") {
    if (!local || !(local.rateFromUsd > 0)) {
      return {
        lead,
        outcome: `Se convierte a dólares con la tasa que corresponde y se descuenta de lo que falta por cobrar, ${formatCents(balanceCents, "USD")}.`,
        excess: null,
      };
    }
    const enDolares = Math.round(amountCents / local.rateFromUsd);
    const conTasa = `Con la tasa de ${local.rateLabel}`;
    if (enDolares < balanceCents) {
      const resta = Math.max(1, local.balanceCents - amountCents);
      return {
        lead,
        outcome: `${conTasa}, quedará un saldo de ${formatCents(resta, currency)} por cobrar.`,
        excess: null,
      };
    }
    const sobra = amountCents - local.balanceCents;
    return {
      lead,
      outcome: `${conTasa}, la reserva quedará pagada y se emitirá el ticket.`,
      excess:
        enDolares > balanceCents && sobra > 0
          ? `Supera lo que falta por cobrar en ${formatCents(sobra, currency)}. El excedente también quedará registrado.`
          : null,
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

/** Centavos como texto para el campo del monto: "8979,00" (sin separador de miles). */
export function centsToInput(cents: number): string {
  return `${Math.floor(cents / 100)},${(cents % 100).toString().padStart(2, "0")}`;
}
