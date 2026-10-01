"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Alert } from "@/components/alert";
import { IconAlertCircle } from "@/components/icons";
import { currencyName, deadlinePhrase, estimatedOnlineDeadline } from "@/components/passenger-copy";
import { StickyActions } from "@/components/sticky-actions";
import { SubmitButton } from "@/components/submit-button";
import { Card } from "@/components/ui";
import { buttonClass, cx } from "@/components/ui-classes";
import { formatCaracasDate, formatCaracasTime24 } from "@/lib/time";
import { dueForRelease12h } from "@/modules/scheduler";
import { crearReservaAction, type CrearReservaState } from "./actions";
import {
  DOCUMENTS_RETURN_HREF,
  type CompanionForm,
  type DepartureVM,
  type PaymentMethodVM,
} from "./booking-form";
import { ChosenDeparture } from "./chosen-departure";
import { convertCents, formatCents, type BookingCost } from "./money";
import { revealAndFocus } from "./reveal";

const initialCrearState: CrearReservaState = { error: null };

interface StepPaymentProps {
  departure: DepartureVM;
  now: Date;
  availableMethods: PaymentMethodVM[];
  /** Falso cuando faltan menos de 12 horas: ya no se puede elegir pagar en la taquilla. */
  physicalAllowed: boolean;
  selectedMethod: PaymentMethodVM | null;
  onChangePaymentMethod: (id: string) => void;
  passengerCount: number;
  cost: BookingCost;
  exchangeRates: Partial<Record<"VES" | "COP", string>>;
  companions: CompanionForm[];
  policiesAccepted: boolean;
  summary: ReactNode;
  onBack: () => void;
  onGoToStep: (step: 1 | 2 | 3 | 4) => void;
}

/** Equivalente del total en la moneda del método, con la tasa del día; `null` si es en dólares o no hay tasa. */
function equivalente(
  totalCents: bigint,
  method: PaymentMethodVM,
  rates: Partial<Record<"VES" | "COP", string>>,
): string | null {
  if (method.currency !== "VES" && method.currency !== "COP") return null;
  const rate = rates[method.currency];
  if (!rate) return null;
  const cents = convertCents(totalCents, rate);
  return cents === null ? null : formatCents(cents, method.currency);
}

/**
 * Paso 4 del asistente: elegir cómo pagar (en línea o en la taquilla), ver
 * el recibo con la tarifa, la tasa del terminal y el total, y confirmar la
 * reserva. Los datos para pagar se muestran después, en la reserva creada,
 * para que nadie pague antes de tener su puesto.
 */
export function StepPayment({
  departure,
  now,
  availableMethods,
  physicalAllowed,
  selectedMethod,
  onChangePaymentMethod,
  passengerCount,
  cost,
  exchangeRates,
  companions,
  policiesAccepted,
  summary,
  onBack,
  onGoToStep,
}: StepPaymentProps) {
  const [state, formAction] = useActionState(crearReservaAction, initialCrearState);
  const errorRef = useRef<HTMLDivElement>(null);
  const methodsRef = useRef<HTMLFieldSetElement>(null);
  // Contador y no booleano: cada toque de "Confirmar reserva" sin forma de pago vuelve a llevar las opciones a la vista.
  const [intentos, setIntentos] = useState(0);
  const faltaMetodo = intentos > 0 && !selectedMethod;

  // Después del render en que aparece el aviso, para que también quede a la vista (como en el paso 3).
  useEffect(() => {
    if (intentos === 0 || selectedMethod) return;
    revealAndFocus(methodsRef.current, methodsRef.current?.querySelector<HTMLInputElement>("input[type=radio]") ?? null);
    // Solo cuando la persona vuelve a tocar "Confirmar reserva".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentos]);

  useEffect(() => {
    if (state.error) {
      errorRef.current?.focus({ preventScroll: true });
      errorRef.current?.scrollIntoView({ block: "center" });
    }
  }, [state]);

  const companionsPayload = JSON.stringify(
    companions.map((c) => ({
      fullName: c.fullName.trim(),
      idNumber: c.idNumber.trim(),
      birthYear: Number.parseInt(c.birthYear, 10),
    })),
  );

  const enLinea = availableMethods.filter((m) => m.kind === "DIGITAL");
  const enTaquilla = availableMethods.filter((m) => m.kind === "FISICO");
  // Misma ventana con la que el barrido libera el puesto (`dueForRelease12h`), igual que el aviso.
  const plazoTaquillaMs = dueForRelease12h(now).getTime() - now.getTime();
  const limiteTaquilla = new Date(new Date(departure.departsAtIso).getTime() - plazoTaquillaMs);
  const total = formatCents(cost.totalCents, "USD");
  // Si el bus sale antes de que venzan las 2 horas, el plazo es la salida.
  const plazoEnLinea = estimatedOnlineDeadline(new Date(departure.departsAtIso), now);
  const totalEnMoneda = selectedMethod ? equivalente(cost.totalCents, selectedMethod, exchangeRates) : null;

  function metodoOpcion(m: PaymentMethodVM) {
    const checked = selectedMethod?.id === m.id;
    return (
      <li key={m.id}>
        <label
          className={cx(
            "flex min-h-14 cursor-pointer items-center gap-3 rounded-control border-2 bg-superficie px-4 py-3 transition-colors duration-150 ease-out motion-reduce:transition-none has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-marca-600",
            checked ? "border-marca-600 bg-marca-50" : "border-borde-control hover:border-marca-600",
          )}
        >
          <input
            type="radio"
            name="paymentMethodId"
            value={m.id}
            checked={checked}
            onChange={() => onChangePaymentMethod(m.id)}
            className="size-5 shrink-0 cursor-pointer accent-marca-600 focus-visible:outline-none"
          />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="break-words font-semibold text-tinta">{m.name}</span>
            <span className="text-sm text-tinta-suave">
              Pagas en {currencyName(m.currency)}
              {m.currency === "USDT" ? " (dólar digital)" : null}
            </span>
          </span>
        </label>
      </li>
    );
  }

  /**
   * Sin forma de pago no se envía: el aviso aparece dentro de las opciones y
   * el efecto de arriba las lleva a la vista. `noValidate` evita el globo
   * nativo del navegador, que desaparece solo y habla en el idioma del sistema.
   */
  function validarAntesDeEnviar(event: FormEvent<HTMLFormElement>) {
    if (!selectedMethod) {
      event.preventDefault();
      setIntentos((n) => n + 1);
    }
  }

  return (
    <form action={formAction} onSubmit={validarAntesDeEnviar} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="departureId" value={departure.id} />
      <input type="hidden" name="companions" value={companionsPayload} />
      <input type="hidden" name="policiesAccepted" value={policiesAccepted ? "on" : ""} />

      <ChosenDeparture departure={departure} now={now} />

      {availableMethods.length === 0 ? (
        <Alert tone="alerta" role="none" title="Esta salida no tiene formas de pago disponibles">
          Elige otra salida o pregunta en la taquilla de {departure.agencyName}.
        </Alert>
      ) : (
        <fieldset
          ref={methodsRef}
          aria-describedby={faltaMetodo ? "forma-pago-error" : undefined}
          className="flex flex-col gap-4"
        >
          <legend className="sr-only">Forma de pago</legend>
          {faltaMetodo ? (
            <div id="forma-pago-error">
              <Alert tone="peligro" title="Falta elegir cómo vas a pagar">
                Elige una forma de pago para confirmar tu reserva.
              </Alert>
            </div>
          ) : !selectedMethod ? (
            <p className="flex items-center gap-2 text-sm font-medium text-tinta-suave">
              <IconAlertCircle aria-hidden="true" className="size-4 shrink-0" />
              Elige una forma de pago para confirmar.
            </p>
          ) : null}
          {enLinea.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-tinta">Pagar en línea</p>
              <p className="text-sm text-tinta-suave">
                Pagas desde tu banco o billetera y subes la captura del pago.
              </p>
              <ul className="flex flex-col gap-2">{enLinea.map(metodoOpcion)}</ul>
            </div>
          ) : null}
          {enTaquilla.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-tinta">Pagar en la taquilla</p>
              <p className="text-sm text-tinta-suave">
                Pagas en efectivo en la taquilla de {departure.agencyName}.
              </p>
              <ul className="flex flex-col gap-2">{enTaquilla.map(metodoOpcion)}</ul>
            </div>
          ) : null}
          {!physicalAllowed ? (
            <p className="text-sm text-tinta-suave">
              Este bus sale en menos de 12 horas, así que ya no puedes pagar en la taquilla. Paga en línea.
            </p>
          ) : null}
        </fieldset>
      )}

      {selectedMethod?.kind === "DIGITAL" ? (
        <Card className="flex flex-col gap-3">
          <p className="font-semibold text-tinta">Qué sigue</p>
          <ol className="flex flex-col gap-2">
            {[
              "Confirmas tu reserva con el botón de abajo.",
              `Pagas ${totalEnMoneda ?? total} con ${selectedMethod.name}: te mostramos los datos.`,
              plazoEnLinea?.boundByDeparture
                ? `Subes la captura del pago antes de ${deadlinePhrase(plazoEnLinea, now)}.`
                : "Subes la captura del pago. Tienes 2 horas para hacerlo.",
            ].map((paso, indice) => (
              <li key={paso} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="tabular grid size-7 shrink-0 place-items-center rounded-full bg-marca-600 text-sm font-bold text-white"
                >
                  {indice + 1}
                </span>
                <span className="leading-relaxed text-tinta">
                  <span className="sr-only">Paso {indice + 1}: </span>
                  {paso}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      {selectedMethod?.kind === "FISICO" ? (
        <Alert tone="info" role="none" title="Pagas en la taquilla">
          Paga {total} en la taquilla de {departure.agencyName} antes del {formatCaracasDate(limiteTaquilla)} a
          las {formatCaracasTime24(limiteTaquilla)}. Si no, el puesto se libera.
        </Alert>
      ) : null}

      <Card className="flex flex-col gap-3">
        <p className="font-semibold text-tinta">Tu recibo</p>
        <dl className="tabular flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-tinta-suave">
              Pasaje × {passengerCount}
              <span className="block text-sm">{formatCents(cost.fareCents, "USD")} por persona</span>
            </dt>
            <dd className="font-semibold text-tinta">{formatCents(cost.fareTotalCents, "USD")}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-tinta-suave">
              Tasa del terminal × {passengerCount}
              <span className="block text-sm">{formatCents(cost.taxCents, "USD")} por persona</span>
            </dt>
            <dd className="font-semibold text-tinta">{formatCents(cost.taxTotalCents, "USD")}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-t border-borde pt-3">
            <dt className="font-bold text-tinta">Total a pagar</dt>
            <dd className="text-2xl font-bold text-tinta">{total}</dd>
          </div>
          {totalEnMoneda && selectedMethod ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-tinta-suave">En {currencyName(selectedMethod.currency)}, con la tasa de hoy</dt>
              <dd className="font-semibold text-tinta">{totalEnMoneda}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      {state.error ? (
        <div ref={errorRef} tabIndex={-1} className="outline-none">
          <Alert
            tone="peligro"
            title="No pudimos confirmar tu reserva"
            action={
              state.missingDocuments ? (
                <Link href={DOCUMENTS_RETURN_HREF} className={buttonClass("secundario", undefined, "sm")}>
                  Ir a mis documentos
                </Link>
              ) : state.error.startsWith("No se pudieron leer") ? (
                <button type="button" onClick={() => onGoToStep(2)} className={buttonClass("secundario", undefined, "sm")}>
                  Revisar pasajeros
                </button>
              ) : undefined
            }
          >
            {state.error}
          </Alert>
        </div>
      ) : null}

      <StickyActions summary={summary}>
        <button type="button" onClick={onBack} className={buttonClass("secundario", "shrink-0", "lg")}>
          Atrás
        </button>
        <SubmitButton
          pendingLabel="Confirmando…"
          disabled={availableMethods.length === 0}
          className={buttonClass("primario", "flex-1", "lg")}
        >
          Confirmar reserva
        </SubmitButton>
      </StickyActions>
    </form>
  );
}
