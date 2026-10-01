import type { Currency } from "@prisma/client";
import { PanelFeedback } from "@/components/panel-feedback";
import { SubmitButton } from "@/components/submit-button";
import { panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { formatUsdString } from "@/lib/decimal";
import { cashPaymentAction } from "@/app/panel/pasajeros/actions";
import { CashConfirmSubmit } from "./cash-confirm";
import { findCashReservationAction } from "./cash-lookup-action";
import { PanelField, panelFieldAria } from "./panel-field";

const CURRENCIES: readonly Currency[] = ["USD", "VES", "COP", "USDT"];

/**
 * Qué tasa se usa al cobrar, según la moneda de la reserva (regla de negocio):
 * en la moneda de la reserva, la tasa congelada con la que se hizo; en otra
 * moneda local, la tasa vigente de hoy. Dólares y USDT van uno a uno.
 */
function conversionHint(currency: Currency): string {
  if (currency === "VES") {
    return "Si cobras en bolívares, se usa la tasa con la que se hizo la reserva; en pesos colombianos, la tasa vigente de hoy. Dólares y USDT van uno a uno.";
  }
  if (currency === "COP") {
    return "Si cobras en pesos colombianos, se usa la tasa con la que se hizo la reserva; en bolívares, la tasa vigente de hoy. Dólares y USDT van uno a uno.";
  }
  return "Si cobras en bolívares o en pesos colombianos, se convierte con la tasa vigente de hoy. Dólares y USDT van uno a uno.";
}

/** Nombre de cada moneda junto a su código, para quien no reconoce la sigla. */
const CURRENCY_NAMES: Record<Currency, string> = {
  USD: "USD · dólares",
  VES: "VES · bolívares",
  COP: "COP · pesos colombianos",
  USDT: "USDT · dólar digital",
};

type CashPaymentFormProps =
  | { mode: "codigo"; returnTo?: "tablero"; error?: string; hidden?: Record<string, string> }
  | {
      mode: "reserva";
      reservationId: string;
      balanceUsd: string;
      currency: Currency;
      /** Titular de la reserva, para nombrarlo en la confirmación del cobro. */
      holderName?: string;
      amountInCurrencyHint?: string;
      error?: string;
      hidden?: Record<string, string>;
    };

/** Campos ocultos con el contexto de retorno (vista, página, filtros y reserva de origen). */
function HiddenFields({ hidden }: { hidden?: Record<string, string> }) {
  if (!hidden) return null;
  return (
    <>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </>
  );
}

/**
 * Formulario reutilizable de cobro en efectivo, en dos pasos para no cobrar
 * a ciegas:
 * - Modo "codigo" (registro rápido del tablero o "Registrar cobro" de
 *   Pasajeros y pagos): solo pide el código de la reserva y "Buscar reserva"
 *   abre su detalle en Pasajeros y pagos, con el titular, la salida y lo que
 *   falta por cobrar.
 * - Modo "reserva" (ese detalle): la reserva ya está fija, el monto se
 *   precarga con el saldo pendiente y "Registrar cobro" pide confirmar con
 *   las cifras antes de guardar.
 */
export function CashPaymentForm(props: CashPaymentFormProps) {
  // El ejemplo va en la ayuda y no como marcador: un código gris dentro del
  // campo parece un valor ya escrito. Es el código de la reserva, no del
  // ticket: quien paga en taquilla todavía no tiene ticket.
  const ayudaCodigo =
    "Es el código de la reserva que el pasajero ve en su teléfono, en «Mis viajes». Por ejemplo: TR-0911-3PAX-Y962.";
  const ayudaMonto = "Puedes usar coma o punto para los céntimos, por ejemplo 12,50.";

  if (props.mode === "codigo") {
    return (
      <form action={findCashReservationAction} className="flex flex-col gap-5">
        <PanelFeedback error={props.error} />
        {props.returnTo ? <input type="hidden" name="origen" value="tablero" /> : null}
        <HiddenFields hidden={props.hidden} />
        <p className="text-base leading-relaxed text-tinta-suave">
          Primero busca la reserva: verás a nombre de quién está y cuánto falta por cobrar antes de registrar el
          pago.
        </p>
        <PanelField id="cobro-codigo" label="Código de la reserva" hint={ayudaCodigo}>
          <input
            type="text"
            name="code"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className={panelInputClass("tabular uppercase")}
            {...panelFieldAria("cobro-codigo", ayudaCodigo)}
          />
        </PanelField>
        <SubmitButton pendingLabel="Buscando reserva…" className={panelButtonClass("primario", "lg", "w-full sm:w-fit")}>
          Buscar reserva
        </SubmitButton>
      </form>
    );
  }

  return (
    <form action={cashPaymentAction} className="flex flex-col gap-5">
      <PanelFeedback error={props.error} />
      <HiddenFields hidden={props.hidden} />
      <input type="hidden" name="reservationId" value={props.reservationId} />
      <div className="flex flex-col gap-1 rounded-control border border-borde bg-lienzo px-4 py-3">
        <p className="text-sm font-semibold text-tinta-suave">Falta por cobrar</p>
        <p className="tabular text-2xl font-bold text-tinta">{formatUsdString(props.balanceUsd)}</p>
        <p className="text-sm leading-snug text-tinta-suave">{conversionHint(props.currency)}</p>
        {props.amountInCurrencyHint ? (
          <p className="text-sm leading-snug text-tinta-suave">{props.amountInCurrencyHint}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <PanelField id="cobro-monto" label="Monto recibido" hint={ayudaMonto}>
          <input
            type="text"
            name="amount"
            required
            inputMode="decimal"
            autoComplete="off"
            defaultValue={props.balanceUsd}
            className={panelInputClass("tabular")}
            {...panelFieldAria("cobro-monto", ayudaMonto)}
          />
        </PanelField>

        <PanelField id="cobro-moneda" label="Moneda">
          <select name="currency" defaultValue="USD" className={panelInputClass()} {...panelFieldAria("cobro-moneda")}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {CURRENCY_NAMES[c]}
              </option>
            ))}
          </select>
        </PanelField>
      </div>

      <CashConfirmSubmit balanceUsd={props.balanceUsd} holderName={props.holderName} />
    </form>
  );
}
