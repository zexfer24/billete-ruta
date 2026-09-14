"use client";

import type { Currency } from "@prisma/client";
import type { ChangeResult } from "./change";
import type { PaymentMethodOption } from "./counter-sale-form";

export interface QuoteResult {
  fareTotalUsd: string;
  taxTotalUsd: string;
  totalUsd: string;
  currency: Currency;
  amountInCurrency: string;
}

/** Formatea un monto en la moneda dada, con separador de miles y coma decimal. */
export function formatAmount(value: string, currency: Currency): string {
  const prefijos: Record<Currency, string> = { USD: "$ ", VES: "Bs. ", COP: "COP ", USDT: "USDT " };
  const numero = Number(value);
  const formateado = new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numero) ? numero : 0);
  return `${prefijos[currency]}${formateado}`;
}

/**
 * Botones, insumos y etiquetas propios de la taquilla: se usa en el
 * mostrador, así que exige controles de 44 px y texto base de 16 px, más
 * grandes que el resto del panel (`panelButtonClass`/`panelInputClass` dan
 * 40 px y 14 px). Viven en este archivo, sin dependencias de otros pasos,
 * para que `step-holder.tsx` y `step-companions.tsx` los importen sin crear
 * un ciclo con `counter-sale-form.tsx`.
 */
const TAQUILLA_BUTTON_VARIANTS = {
  primario: "bg-[var(--color-acento)] text-white hover:brightness-90",
  secundario:
    "border border-[var(--color-borde)] bg-[var(--color-superficie)] hover:bg-[var(--color-acento-suave)]",
  exito: "bg-[var(--color-exito)] text-white hover:brightness-90",
  fantasma: "text-[var(--color-acento)] hover:bg-[var(--color-acento-suave)]",
} as const;

export function taquillaButtonClass(variant: keyof typeof TAQUILLA_BUTTON_VARIANTS, extra?: string): string {
  return [
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-base font-medium transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-acento)] disabled:cursor-not-allowed disabled:opacity-50",
    TAQUILLA_BUTTON_VARIANTS[variant],
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

export function taquillaInputClass(extra?: string): string {
  return [
    "min-h-11 w-full rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-base text-[var(--color-texto)] transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-acento)] disabled:bg-[var(--color-fondo)] disabled:text-[var(--color-texto-suave)]",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

export const TAQUILLA_LABEL_CLASS = "flex flex-col gap-1 text-base font-medium";

/** Paso 4 del asistente: método de pago, cotización, vuelto y confirmación en dos tiempos. */
export function StepPayment({
  paymentMethods,
  selectedId,
  onSelect,
  quote,
  quotePending,
  quoteError,
  receivedAmount,
  onChangeReceived,
  changeResult,
  confirmOpen,
  onOpenConfirm,
  onCloseConfirm,
  submitting,
}: {
  paymentMethods: PaymentMethodOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  quote: QuoteResult | null;
  quotePending: boolean;
  quoteError: string | null;
  receivedAmount: string;
  onChangeReceived: (value: string) => void;
  changeResult: ChangeResult | null;
  confirmOpen: boolean;
  onOpenConfirm: () => void;
  onCloseConfirm: () => void;
  submitting: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div role="radiogroup" aria-label="Método de pago" className="flex flex-col gap-3">
        {paymentMethods.map((m) => {
          const selected = m.id === selectedId;
          return (
            <label
              key={m.id}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors duration-150 motion-reduce:transition-none ${
                selected
                  ? "border-[var(--color-acento)] bg-[var(--color-acento-suave)]"
                  : "border-[var(--color-borde)] bg-[var(--color-superficie)]"
              }`}
            >
              <input
                type="radio"
                name="paymentMethodId"
                value={m.id}
                checked={selected}
                onChange={() => onSelect(m.id)}
                className="h-5 w-5 shrink-0 accent-[var(--color-acento)]"
              />
              <span className="flex-1">
                {m.name} · {m.currency}
                {m.rateFromUsd && (m.currency === "VES" || m.currency === "COP")
                  ? ` · Tasa: ${m.rateFromUsd}`
                  : ""}
              </span>
            </label>
          );
        })}
      </div>

      <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4">
        {quotePending ? (
          <p className="text-sm text-[var(--color-texto-suave)]">Calculando…</p>
        ) : quoteError ? (
          <p role="alert" className="text-sm font-medium text-[var(--color-peligro)]">
            {quoteError}
          </p>
        ) : quote ? (
          <div className="flex flex-col gap-2">
            <dl className="tabular grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-[var(--color-texto-suave)]">Tarifa</dt>
                <dd className="font-medium">{formatAmount(quote.fareTotalUsd, "USD")}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-texto-suave)]">Tasa de salida</dt>
                <dd className="font-medium">{formatAmount(quote.taxTotalUsd, "USD")}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-texto-suave)]">Total en USD</dt>
                <dd className="font-medium">{formatAmount(quote.totalUsd, "USD")}</dd>
              </div>
            </dl>
            <p className="text-lg font-semibold">
              Total a cobrar: {formatAmount(quote.amountInCurrency, quote.currency)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-texto-suave)]">Elige un método de pago para cotizar.</p>
        )}
      </div>

      {quote ? (
        <label className={TAQUILLA_LABEL_CLASS}>
          Recibido ({quote.currency})
          <input
            type="text"
            inputMode="decimal"
            value={receivedAmount}
            onChange={(e) => onChangeReceived(e.target.value)}
            className={taquillaInputClass("w-40")}
          />
        </label>
      ) : null}

      {quote && changeResult && changeResult.kind !== "invalido" ? (
        <p className="tabular text-sm font-medium">
          {changeResult.kind === "vuelto" ? "Vuelto" : "Faltan"}:{" "}
          {formatAmount((changeResult.cents / 100).toString(), quote.currency)}
        </p>
      ) : null}

      {quote && !confirmOpen ? (
        <button type="button" onClick={onOpenConfirm} className={taquillaButtonClass("exito", "w-full")}>
          Cobrar {formatAmount(quote.amountInCurrency, quote.currency)} y emitir ticket
        </button>
      ) : null}

      {quote && confirmOpen ? (
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-alerta)] bg-[var(--color-alerta-suave)] p-4">
          <p className="text-sm">
            ¿Confirmas el cobro de {formatAmount(quote.amountInCurrency, quote.currency)} en efectivo? La
            venta no se puede deshacer desde esta pantalla.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className={taquillaButtonClass("exito", "flex-1")}
            >
              {submitting ? "Procesando…" : "Sí, cobrar y emitir"}
            </button>
            <button
              type="button"
              onClick={onCloseConfirm}
              disabled={submitting}
              className={taquillaButtonClass("secundario", "flex-1")}
            >
              Revisar datos
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
