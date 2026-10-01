"use client";

import { useRef, useState } from "react";
import type { Currency } from "@prisma/client";
import { PANEL_LABEL_CLASS, panelInputClass } from "@/components/ui-classes";
import { centsToInput, formatCents } from "./cash-confirm-text";
import type { CashEquivalent } from "./cash-equivalents";

/** Nombre de cada moneda junto a su código, para quien no reconoce la sigla. */
const CURRENCY_NAMES: Record<Currency, string> = {
  USD: "USD · dólares",
  VES: "VES · bolívares",
  COP: "COP · pesos colombianos",
  USDT: "USDT · dólar digital",
};

/** Nombre de la moneda dentro de una frase. */
const CURRENCY_WORDS: Record<Currency, string> = {
  USD: "dólares",
  VES: "bolívares",
  COP: "pesos colombianos",
  USDT: "USDT",
};

/** Ayuda del campo de moneda: con qué tasa se convierte lo que se cobra en ella. */
function rateHint(equivalent: CashEquivalent | undefined): string {
  if (!equivalent?.rateLabel) return "Dólares y USDT van uno a uno.";
  return equivalent.frozenRate
    ? `Tasa de la reserva: ${equivalent.rateLabel}.`
    : `Tasa vigente de hoy: ${equivalent.rateLabel}.`;
}

/**
 * Moneda y monto del cobro en efectivo, en ese orden: primero se elige en qué
 * moneda paga el pasajero y luego se escribe cuánto entregó. El monto viene
 * con lo que falta por cobrar y, al cambiar la moneda, se reemplaza por lo que
 * falta en esa moneda con la tasa que usará el servidor, salvo que el
 * taquillero ya lo haya cambiado a mano: entonces su cifra se respeta y se le
 * avisa que la revise. Una moneda sin tasa cargada hoy no se ofrece, y se
 * explica por qué. Debajo se dice cuánto falta en las otras monedas locales,
 * para cobrar sin calculadora.
 */
export function CashAmountFields({ equivalents }: { equivalents: readonly CashEquivalent[] }) {
  const amountRef = useRef<HTMLInputElement>(null);
  // Si el taquillero ya escribió su cifra, cambiar la moneda no la borra.
  const editadoRef = useRef(false);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [revisar, setRevisar] = useState(false);
  const disponibles = equivalents.filter((e) => e.balanceCents !== null);
  const sinTasa = equivalents.filter((e) => e.balanceCents === null);
  const elegida = disponibles.find((e) => e.currency === currency);
  const inicial = disponibles.find((e) => e.currency === "USD")?.balanceCents ?? 0;
  const otras = disponibles.filter((e) => e.rateLabel !== null);

  function onCurrencyChange(next: Currency) {
    setCurrency(next);
    const saldo = disponibles.find((e) => e.currency === next)?.balanceCents;
    const input = amountRef.current;
    if (editadoRef.current) {
      setRevisar(true);
      return;
    }
    if (input && saldo !== null && saldo !== undefined) {
      input.value = centsToInput(saldo);
      input.setCustomValidity("");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cobro-moneda" className={PANEL_LABEL_CLASS}>
            Moneda
          </label>
          <select
            id="cobro-moneda"
            name="currency"
            value={currency}
            onChange={(event) => {
              const next = disponibles.find((e) => e.currency === event.target.value)?.currency;
              if (next) onCurrencyChange(next);
            }}
            aria-describedby="cobro-moneda-ayuda"
            className={panelInputClass()}
          >
            {disponibles.map((e) => (
              <option key={e.currency} value={e.currency}>
                {CURRENCY_NAMES[e.currency]}
              </option>
            ))}
          </select>
          <p id="cobro-moneda-ayuda" aria-live="polite" className="tabular text-sm leading-snug text-tinta-suave">
            {rateHint(elegida)}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="cobro-monto" className={PANEL_LABEL_CLASS}>
            Monto recibido
          </label>
          <input
            ref={amountRef}
            id="cobro-monto"
            type="text"
            name="amount"
            required
            inputMode="decimal"
            autoComplete="off"
            defaultValue={centsToInput(inicial)}
            onInput={() => {
              editadoRef.current = true;
              setRevisar(false);
            }}
            aria-describedby="cobro-monto-ayuda cobro-monto-revisar"
            className={panelInputClass("tabular")}
          />
          <p id="cobro-monto-ayuda" className="text-sm leading-snug text-tinta-suave">
            Ya trae lo que falta en esa moneda. Cámbialo si te entregan otra cantidad. Usa coma o punto para los
            céntimos.
          </p>
          <p id="cobro-monto-revisar" aria-live="polite" className="text-sm font-medium leading-snug text-alerta">
            {revisar ? `Revisa el monto: ahora se cobra en ${CURRENCY_WORDS[currency]}.` : null}
          </p>
        </div>
      </div>

      {otras.length > 0 ? (
        <p className="tabular text-sm leading-snug text-tinta-suave">
          Lo que falta equivale a{" "}
          {otras.map((e, i) => (
            <span key={e.currency}>
              {i > 0 ? " o " : null}
              <span className="whitespace-nowrap font-semibold text-tinta">{formatCents(e.balanceCents ?? 0, e.currency)}</span>
            </span>
          ))}
          .
        </p>
      ) : null}

      {sinTasa.length > 0 ? (
        <p className="text-sm leading-snug text-alerta">
          Hoy no hay tasa de {sinTasa.map((e) => CURRENCY_WORDS[e.currency]).join(" ni de ")} cargada, así que no
          puedes cobrar en {sinTasa.length === 1 ? "esa moneda" : "esas monedas"}. El administrador del terminal la
          carga.
        </p>
      ) : null}
    </div>
  );
}
