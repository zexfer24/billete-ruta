import type { Currency } from "@prisma/client";
import { PanelFeedback } from "@/components/panel-feedback";
import { SubmitButton } from "@/components/submit-button";
import { panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { formatUsdString } from "@/lib/decimal";
import { cashPaymentAction } from "@/app/panel/pasajeros/actions";
import { PanelField, panelFieldAria } from "./panel-field";

const CURRENCIES: readonly Currency[] = ["USD", "VES", "COP", "USDT"];

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
 * Formulario reutilizable de cobro en efectivo. En modo "codigo" (taquilla o
 * registro rápido del tablero) pide el código del ticket; en modo "reserva"
 * la reserva ya está fija, viene del panel lateral de "Pasajeros y pagos" y
 * el monto se precarga con el saldo pendiente.
 */
export function CashPaymentForm(props: CashPaymentFormProps) {
  const ayudaCodigo = "Está impreso en el ticket, debajo del código QR.";
  const ayudaMonto = "Puedes usar coma o punto para los céntimos, por ejemplo 12,50.";

  return (
    <form action={cashPaymentAction} className="flex flex-col gap-5">
      <PanelFeedback error={props.error} />
      {props.mode === "codigo" && props.returnTo ? (
        <input type="hidden" name="origen" value="tablero" />
      ) : null}
      <HiddenFields hidden={props.hidden} />

      {props.mode === "reserva" ? (
        <>
          <input type="hidden" name="reservationId" value={props.reservationId} />
          <div className="flex flex-col gap-1 rounded-control border border-borde bg-lienzo px-4 py-3">
            <p className="text-sm font-semibold text-tinta-suave">Falta por cobrar</p>
            <p className="tabular text-2xl font-bold text-tinta">{formatUsdString(props.balanceUsd)}</p>
            <p className="text-sm leading-snug text-tinta-suave">
              Si cobras en otra moneda, se convierte con la tasa de cambio vigente.
            </p>
            {props.amountInCurrencyHint ? (
              <p className="text-sm leading-snug text-tinta-suave">{props.amountInCurrencyHint}</p>
            ) : null}
          </div>
        </>
      ) : (
        <PanelField id="cobro-codigo" label="Código del ticket" hint={ayudaCodigo}>
          <input
            type="text"
            name="code"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="TR-0911-3PAX-Y962"
            className={panelInputClass("tabular uppercase")}
            {...panelFieldAria("cobro-codigo", ayudaCodigo)}
          />
        </PanelField>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <PanelField id="cobro-monto" label="Monto recibido" hint={ayudaMonto}>
          <input
            type="text"
            name="amount"
            required
            inputMode="decimal"
            autoComplete="off"
            defaultValue={props.mode === "reserva" ? props.balanceUsd : undefined}
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

      <SubmitButton pendingLabel="Registrando cobro…" className={panelButtonClass("exito", "lg", "w-full sm:w-fit")}>
        Registrar cobro
      </SubmitButton>
    </form>
  );
}
