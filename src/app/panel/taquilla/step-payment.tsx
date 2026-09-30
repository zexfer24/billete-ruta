"use client";

import type { Currency } from "@prisma/client";
import { Skeleton } from "@/components/skeleton";
import { Alert } from "@/components/alert";
import { panelButtonClass } from "@/components/panel-ui";
import { IconCheckCircle, IconChevronDown, IconRefresh, IconWarning } from "@/components/icons";
import { countLabel } from "../_dashboard/text";
import type { ChangeResult } from "./change";
import type { PaymentMethodOption } from "./counter-sale-form";
import { CounterField } from "./counter-field";

export interface QuoteResult {
  fareTotalUsd: string;
  taxTotalUsd: string;
  totalUsd: string;
  currency: Currency;
  amountInCurrency: string;
}

const PREFIJOS: Record<Currency, string> = { USD: "$ ", VES: "Bs. ", COP: "COP ", USDT: "USDT " };

/** Nombre de cada moneda en palabras, para etiquetas como "Dinero recibido (bolívares)". */
export const CURRENCY_NAMES: Record<Currency, string> = {
  USD: "dólares",
  VES: "bolívares",
  COP: "pesos colombianos",
  USDT: "USDT",
};

/** Formatea un monto en la moneda dada, con separador de miles y coma decimal. */
export function formatAmount(value: string, currency: Currency): string {
  const numero = Number(value);
  const formateado = new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numero) ? numero : 0);
  return `${PREFIJOS[currency]}${formateado}`;
}

/** Tasa de cambio legible: "1 US$ = Bs. 36,50". Solo para monedas que no van 1 a 1 con el dólar. */
export function formatRate(rateFromUsd: string | null, currency: Currency): string | null {
  if (!rateFromUsd || (currency !== "VES" && currency !== "COP")) return null;
  return `1 US$ = ${formatAmount(rateFromUsd, currency)}`;
}

/**
 * Paso 4 del asistente: forma de pago, el total a cobrar y el vuelto, las dos
 * cifras que el cajero necesita, en tamaño muy grande. El botón de cobrar vive
 * en la barra inferior del asistente, igual que "Continuar" en los otros pasos.
 */
export function StepPayment({
  paymentMethods,
  selectedId,
  onSelect,
  quote,
  quotePending,
  quoteError,
  onRetryQuote,
  receivedAmount,
  onChangeReceived,
  changeResult,
  passengerCount,
}: {
  paymentMethods: PaymentMethodOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  quote: QuoteResult | null;
  quotePending: boolean;
  quoteError: string | null;
  onRetryQuote: () => void;
  receivedAmount: string;
  onChangeReceived: (value: string) => void;
  changeResult: ChangeResult | null;
  passengerCount: number;
}) {
  const recibidoInvalido = receivedAmount.trim() !== "" && changeResult?.kind === "invalido";

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-base font-semibold text-tinta">¿Cómo te paga?</legend>
        {paymentMethods.map((m) => {
          const selected = m.id === selectedId;
          const tasa = formatRate(m.rateFromUsd, m.currency);
          return (
            <label
              key={m.id}
              className={`flex min-h-16 cursor-pointer items-center gap-4 rounded-tarjeta border-2 bg-superficie px-4 py-3 transition-colors duration-150 ease-out motion-reduce:transition-none ${
                selected ? "border-marca-600 bg-marca-50" : "border-borde hover:border-marca-600/60"
              }`}
            >
              <input
                type="radio"
                name="paymentMethodId"
                value={m.id}
                checked={selected}
                onChange={() => onSelect(m.id)}
                className="foco size-5 shrink-0 accent-marca-600"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-base font-semibold text-tinta">{m.name}</span>
                <span className="tabular text-sm text-tinta-suave">
                  En {CURRENCY_NAMES[m.currency]}
                  {tasa ? ` · ${tasa}` : ""}
                </span>
              </span>
              {selected ? <IconCheckCircle className="size-6 shrink-0 text-marca-600" /> : null}
            </label>
          );
        })}
      </fieldset>

      <section
        aria-labelledby="total-titulo"
        aria-busy={quotePending || undefined}
        className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-5 shadow-1"
      >
        <h3 id="total-titulo" className="text-base font-semibold text-tinta-suave">
          Total a cobrar
        </h3>
        {quotePending ? (
          <div className="flex flex-col gap-2">
            <span className="sr-only" role="status">
              Calculando el total…
            </span>
            <Skeleton className="h-14 w-64 max-w-full" />
            <Skeleton className="h-5 w-48 rounded-pastilla" />
          </div>
        ) : quoteError ? (
          <Alert
            tone="peligro"
            title="No se pudo calcular el total"
            action={
              <button type="button" onClick={onRetryQuote} className={panelButtonClass("secundario")}>
                <IconRefresh className="size-5" />
                Intentar de nuevo
              </button>
            }
          >
            {quoteError}
          </Alert>
        ) : quote ? (
          <>
            <p className="tabular text-5xl font-bold tracking-tight text-tinta">
              {formatAmount(quote.amountInCurrency, quote.currency)}
            </p>
            <p className="tabular text-[15px] text-tinta-suave">
              {countLabel(passengerCount, "persona", "personas")}
              {quote.currency !== "USD" ? ` · Equivale a ${formatAmount(quote.totalUsd, "USD")}` : ""}
            </p>
            <details className="group">
              <summary className="foco inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-control px-2 -ml-2 text-[15px] font-semibold text-marca-700 hover:bg-marca-50 [&::-webkit-details-marker]:hidden">
                Ver el desglose
                <IconChevronDown className="size-5 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <dl className="tabular mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[15px]">
                <dt className="text-tinta-suave">Pasajes</dt>
                <dd className="text-right font-medium text-tinta">{formatAmount(quote.fareTotalUsd, "USD")}</dd>
                <dt className="text-tinta-suave">Tasa del terminal</dt>
                <dd className="text-right font-medium text-tinta">{formatAmount(quote.taxTotalUsd, "USD")}</dd>
                <dt className="font-semibold text-tinta">Total en dólares</dt>
                <dd className="text-right font-semibold text-tinta">{formatAmount(quote.totalUsd, "USD")}</dd>
              </dl>
            </details>
          </>
        ) : (
          <p className="text-[15px] text-tinta-suave">Elige cómo te paga para ver el total.</p>
        )}
      </section>

      {quote ? (
        <div className="flex flex-col gap-4">
          <CounterField
            id="taquilla-recibido"
            label={`Dinero recibido (${CURRENCY_NAMES[quote.currency]})`}
            hint="Escríbelo para calcular el vuelto. Si te pagan el monto exacto, puedes dejarlo vacío."
            error={recibidoInvalido ? "Escribe solo el número, por ejemplo 1500 o 1500,50." : undefined}
            inputMode="decimal"
            autoComplete="off"
            value={receivedAmount}
            onChange={(e) => onChangeReceived(e.target.value)}
            inputClassName="tabular max-w-xs text-lg"
          />

          <div aria-live="polite">
            {changeResult && !recibidoInvalido && receivedAmount.trim() !== "" ? (
              changeResult.kind === "vuelto" ? (
                <div className="flex flex-col gap-1 rounded-tarjeta border border-exito/30 bg-exito-suave p-5">
                  <p className="flex items-center gap-2 text-base font-semibold text-exito">
                    <IconCheckCircle className="size-5" />
                    {changeResult.cents === 0 ? "Pago exacto, no hay vuelto" : "Vuelto a entregar"}
                  </p>
                  <p className="tabular text-5xl font-bold tracking-tight text-exito">
                    {formatAmount((changeResult.cents / 100).toString(), quote.currency)}
                  </p>
                </div>
              ) : changeResult.kind === "faltan" ? (
                <div className="flex flex-col gap-1 rounded-tarjeta border border-alerta/30 bg-alerta-suave p-5">
                  <p className="flex items-center gap-2 text-base font-semibold text-alerta">
                    <IconWarning className="size-5" />
                    Falta dinero
                  </p>
                  <p className="tabular text-5xl font-bold tracking-tight text-alerta">
                    {formatAmount((changeResult.cents / 100).toString(), quote.currency)}
                  </p>
                  <p className="text-[15px] text-tinta">
                    Pide al pasajero lo que falta o corrige lo recibido antes de cobrar.
                  </p>
                </div>
              ) : null
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
