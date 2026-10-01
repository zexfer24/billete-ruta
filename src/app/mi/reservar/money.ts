/**
 * Cuentas de dinero del asistente de reserva, exactas y sin `number`.
 *
 * El asistente corre en el navegador y no puede usar `Prisma.Decimal`, así
 * que los montos viajan como texto desde el servidor ("12.50") y aquí se
 * convierten a centavos enteros (`bigint`). Multiplicar por la cantidad de
 * pasajeros, sumar y convertir con una tasa de cambio da el mismo resultado
 * que `computeAmounts` del módulo `catalog`: redondeo a dos decimales con el
 * medio hacia arriba. El servidor recalcula todo al crear la reserva; esto
 * solo sirve para mostrar el costo antes de confirmar.
 */

export type MoneyCurrency = "USD" | "VES" | "COP" | "USDT";

// Espacio de no separación (U+00A0), igual que `formatMoney`: el monto no se parte entre líneas.
const PREFIXES: Record<MoneyCurrency, string> = {
  USD: "$ ",
  VES: "Bs. ",
  COP: "COP ",
  USDT: "USDT ",
};

/** Escala de las tasas de cambio: la base de datos guarda seis decimales. */
const RATE_DECIMALS = 6;

/** Convierte un decimal en texto a un entero escalado; `null` si el texto no es un monto válido. */
function parseScaled(value: string, decimals: number): bigint | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) return null;
  const whole = match[1]!;
  const fraction = match[2] ?? "";
  if (fraction.length > decimals) {
    // Solo se aceptan decimales que sobran si son ceros ("12.500" es 12,50).
    if (!/^0*$/.test(fraction.slice(decimals))) return null;
  }
  const padded = fraction.slice(0, decimals).padEnd(decimals, "0");
  return BigInt(whole + padded);
}

/** Monto en centavos a partir de un texto como "12.5" o "12.50"; `null` si no es válido. */
export function parseCents(value: string): bigint | null {
  return parseScaled(value, 2);
}

/**
 * Convierte centavos de dólar a centavos de otra moneda con una tasa en
 * texto ("36.5" bolívares por dólar), con el medio hacia arriba. `null` si
 * la tasa no es válida.
 */
export function convertCents(cents: bigint, rateFromUsd: string): bigint | null {
  const rate = parseScaled(rateFromUsd, RATE_DECIMALS);
  if (rate === null) return null;
  const scale = BigInt(10 ** RATE_DECIMALS);
  const product = cents * rate;
  return (product + scale / BigInt(2)) / scale;
}

/**
 * Formatea centavos igual que `formatMoney` de `lib/decimal.ts`: prefijo de
 * la moneda, punto de miles y coma decimal ("$ 1.234,50", "Bs. 36,50").
 */
export function formatCents(cents: bigint, currency: MoneyCurrency): string {
  const negative = cents < BigInt(0);
  const absolute = negative ? -cents : cents;
  const whole = (absolute / BigInt(100)).toString();
  const fraction = (absolute % BigInt(100)).toString().padStart(2, "0");
  const withThousands = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}${PREFIXES[currency]}${withThousands},${fraction}`;
}

export interface BookingCost {
  fareCents: bigint;
  fareTotalCents: bigint;
  taxCents: bigint;
  taxTotalCents: bigint;
  totalCents: bigint;
}

/**
 * Tarifa de la agencia y tasa del terminal por la cantidad de pasajeros, y
 * su suma. Montos inválidos cuentan como cero para no romper la pantalla.
 */
export function bookingCost(fareUsd: string, taxPerPassengerUsd: string, passengerCount: number): BookingCost {
  const count = BigInt(Math.max(0, Math.floor(passengerCount)));
  const fareCents = parseCents(fareUsd) ?? BigInt(0);
  const taxCents = parseCents(taxPerPassengerUsd) ?? BigInt(0);
  const fareTotalCents = fareCents * count;
  const taxTotalCents = taxCents * count;
  return {
    fareCents,
    fareTotalCents,
    taxCents,
    taxTotalCents,
    totalCents: fareTotalCents + taxTotalCents,
  };
}
