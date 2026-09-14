import type { Currency } from "@prisma/client";
import { PanelFeedback } from "@/components/panel-feedback";
import { PANEL_LABEL_CLASS, panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { cashPaymentAction } from "@/app/panel/pasajeros/actions";

const CURRENCIES: readonly Currency[] = ["USD", "VES", "COP", "USDT"];

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

/** El saldo llega como cadena; se formatea aquí en vez de reutilizar `formatMoney`, que exige un `Prisma.Decimal`. */
function formatSaldoUsd(value: string): string {
  const formateado = new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
  return `US$ ${formateado}`;
}

/**
 * Formulario reutilizable de cobro en efectivo. En modo "codigo" (taquilla o
 * registro rápido del tablero) pide el serial del ticket; en modo "reserva"
 * la reserva ya está fija, viene del panel lateral de "Pasajeros y pagos" y
 * el monto se precarga con el saldo pendiente.
 */
export function CashPaymentForm(props: CashPaymentFormProps) {
  return (
    <form action={cashPaymentAction} className="flex flex-col gap-4">
      <PanelFeedback error={props.error} />
      {props.mode === "codigo" && props.returnTo ? (
        <input type="hidden" name="origen" value="tablero" />
      ) : null}
      <HiddenFields hidden={props.hidden} />

      {props.mode === "reserva" ? (
        <>
          <input type="hidden" name="reservationId" value={props.reservationId} />
          <p className="text-sm text-[var(--color-texto-suave)]">
            Saldo pendiente: {formatSaldoUsd(props.balanceUsd)}. Si cobras en otra moneda, se
            convierte con la tasa de cambio vigente.
          </p>
          {props.amountInCurrencyHint ? (
            <p className="text-sm text-[var(--color-texto-suave)]">{props.amountInCurrencyHint}</p>
          ) : null}
        </>
      ) : (
        <label className={PANEL_LABEL_CLASS}>
          Serial del ticket
          <input
            type="text"
            name="code"
            required
            placeholder="TR-0911-3PAX-Y962"
            className={panelInputClass("uppercase")}
          />
        </label>
      )}

      <label className={PANEL_LABEL_CLASS}>
        Monto
        <input
          type="text"
          name="amount"
          required
          inputMode="decimal"
          defaultValue={props.mode === "reserva" ? props.balanceUsd : undefined}
          className={panelInputClass("w-32")}
        />
      </label>

      <label className={PANEL_LABEL_CLASS}>
        Moneda
        <select name="currency" defaultValue="USD" className={panelInputClass()}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <button type="submit" className={panelButtonClass("exito", "md", "w-fit")}>
        Registrar cobro
      </button>
    </form>
  );
}
