import type { Currency } from "@prisma/client";
import { PanelFeedback } from "@/components/panel-feedback";
import { SubmitButton } from "@/components/submit-button";
import { panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";
import { getCurrentExchangeRate } from "@/modules/catalog";
import { cashPaymentAction } from "@/app/panel/pasajeros/actions";
import { CashAmountFields } from "./cash-amount-fields";
import { CashConfirmSubmit } from "./cash-confirm";
import { cashEquivalents } from "./cash-equivalents";
import { findCashReservationAction } from "./cash-lookup-action";
import { PanelField, panelFieldAria } from "./panel-field";

type CashPaymentFormProps =
  | { mode: "codigo"; returnTo?: "tablero"; error?: string; hidden?: Record<string, string> }
  | {
      mode: "reserva";
      reservationId: string;
      balanceUsd: string;
      currency: Currency;
      /** Titular de la reserva, para nombrarlo en la confirmación del cobro. */
      holderName?: string;
      /**
       * Ya no se muestra: el formulario calcula lo que falta en cada moneda con
       * la tasa que corresponde. Se acepta para no romper a quien lo pase.
       */
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
 *   Pasajeros y pagos): pide el código de la reserva o la cédula del titular
 *   y "Buscar reserva" abre su detalle en Pasajeros y pagos, con el titular,
 *   la salida y lo que falta por cobrar (o, con una cédula de varias
 *   reservas por cobrar, la lista de esas reservas).
 * - Modo "reserva" (ese detalle): la reserva ya está fija, el monto se
 *   precarga con el saldo pendiente en la moneda elegida y "Registrar cobro"
 *   pide confirmar con las cifras antes de guardar.
 */
export function CashPaymentForm(props: CashPaymentFormProps) {
  if (props.mode === "codigo") {
    // El ejemplo va en la ayuda y no como marcador: un código gris dentro del
    // campo parece un valor ya escrito. Es el código de la reserva, no del
    // ticket: quien paga en taquilla todavía no tiene ticket. El código va
    // entero en un renglón: partido en el guion parece otro código.
    const ayudaCodigo = (
      <>
        El pasajero ve el código en su teléfono, en «Mis viajes», por ejemplo{" "}
        <span className="tabular whitespace-nowrap">TR-0911-3PAX-Y962</span>. Si no lo tiene a mano, escribe su
        cédula.
      </>
    );
    return (
      <form action={findCashReservationAction} className="flex flex-col gap-5">
        <PanelFeedback error={props.error} />
        {props.returnTo ? <input type="hidden" name="origen" value="tablero" /> : null}
        <HiddenFields hidden={props.hidden} />
        <p className="text-base leading-relaxed text-tinta-suave">
          Primero busca la reserva: verás a nombre de quién está y cuánto falta por cobrar antes de registrar el
          pago.
        </p>
        <PanelField id="cobro-codigo" label="Código de la reserva o cédula" hint={ayudaCodigo}>
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

  return <CashReservationForm {...props} />;
}

/**
 * Modo "reserva": calcula en el servidor lo que falta en cada moneda (tasa
 * congelada de la reserva o tasa vigente de hoy, como al guardar el cobro) y
 * se lo pasa a los campos y a la confirmación. El saldo en dólares no se
 * repite aquí: ya lo dice la cabecera del detalle de la reserva.
 */
async function CashReservationForm(props: Extract<CashPaymentFormProps, { mode: "reserva" }>) {
  const ahora = new Date();
  const [reserva, ves, cop] = await Promise.all([
    prisma.reservation.findUnique({ where: { id: props.reservationId }, select: { exchangeRateUsed: true } }),
    getCurrentExchangeRate("VES", ahora),
    getCurrentExchangeRate("COP", ahora),
  ]);
  const equivalents = cashEquivalents({
    balanceUsd: toDecimal(props.balanceUsd),
    reservation: { currency: props.currency, exchangeRateUsed: reserva?.exchangeRateUsed ?? toDecimal("0") },
    currentRates: { VES: ves, COP: cop },
  });

  return (
    <form action={cashPaymentAction} className="flex flex-col gap-5">
      <PanelFeedback error={props.error} />
      <HiddenFields hidden={props.hidden} />
      <input type="hidden" name="reservationId" value={props.reservationId} />
      {/* Con otro saldo (tras un abono) los campos vuelven a empezar con el monto nuevo. */}
      <CashAmountFields key={props.balanceUsd} equivalents={equivalents} />
      <CashConfirmSubmit balanceUsd={props.balanceUsd} holderName={props.holderName} equivalents={equivalents} />
    </form>
  );
}
