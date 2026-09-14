"use client";

import { useActionState } from "react";
import { Card, Pill, buttonClass } from "@/components/ui";
import { DepartureRow } from "@/components/departure-row";
import { StickyActions } from "@/components/sticky-actions";
import { DetailsView } from "@/components/details-view";
import { crearReservaAction, type CrearReservaState } from "./actions";
import {
  toDepartureRowData,
  type CompanionForm,
  type DepartureVM,
  type PaymentMethodVM,
} from "./booking-form";

const initialCrearState: CrearReservaState = { error: null };

function formatUsd(value: number): string {
  return `$ ${value.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface StepPaymentProps {
  departure: DepartureVM;
  now: Date;
  availableMethods: PaymentMethodVM[];
  selectedMethod: PaymentMethodVM | null;
  selectedPaymentMethodId: string | null;
  onChangePaymentMethod: (id: string) => void;
  passengerCount: number;
  fareUsd: number;
  fareTotal: number;
  taxPerPassenger: number;
  taxTotal: number;
  total: number;
  companions: CompanionForm[];
  policiesAccepted: boolean;
  onBack: () => void;
}

/** Paso 4 del asistente: método de pago, desglose de montos y confirmación de la reserva. */
export function StepPayment({
  departure,
  now,
  availableMethods,
  selectedMethod,
  selectedPaymentMethodId,
  onChangePaymentMethod,
  passengerCount,
  fareUsd,
  fareTotal,
  taxPerPassenger,
  taxTotal,
  total,
  companions,
  policiesAccepted,
  onBack,
}: StepPaymentProps) {
  const [state, formAction, pending] = useActionState(crearReservaAction, initialCrearState);

  const companionsPayload = JSON.stringify(
    companions.map((c) => ({
      fullName: c.fullName.trim(),
      idNumber: c.idNumber.trim(),
      birthYear: Number.parseInt(c.birthYear, 10),
    })),
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="departureId" value={departure.id} />
      <input type="hidden" name="companions" value={companionsPayload} />
      <input type="hidden" name="policiesAccepted" value={policiesAccepted ? "on" : ""} />

      <DepartureRow departure={toDepartureRowData(departure)} now={now} selected />

      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-tinta">Método de pago</h3>
        {availableMethods.length === 0 ? (
          <p className="text-sm text-tinta-suave">No hay métodos de pago disponibles para esta salida.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {availableMethods.map((m) => (
              <li key={m.id}>
                <label
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-tarjeta border bg-white p-4 has-[:checked]:ring-2 has-[:checked]:ring-marca ${
                    selectedPaymentMethodId === m.id ? "border-marca" : "border-borde"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethodId"
                    value={m.id}
                    checked={selectedPaymentMethodId === m.id}
                    onChange={() => onChangePaymentMethod(m.id)}
                    className="peer h-5 w-5 shrink-0 accent-marca"
                  />
                  <span className="flex-1 font-semibold text-tinta">{m.name}</span>
                  <Pill tone={m.kind === "DIGITAL" ? "marca" : "neutro"}>
                    {m.kind === "DIGITAL" ? `Digital · ${m.currency}` : "En sitio"}
                  </Pill>
                </label>
              </li>
            ))}
          </ul>
        )}

        {selectedMethod && selectedMethod.kind === "DIGITAL" ? (
          <Card className="text-sm">
            <p className="font-semibold text-tinta">Datos de cobro</p>
            <DetailsView value={selectedMethod.details} />
          </Card>
        ) : null}

        {selectedMethod && selectedMethod.kind === "FISICO" ? (
          <Card className="border border-alerta text-sm text-alerta">
            Tu reserva quedará condicional hasta que la agencia registre el cobro en sitio. Debes
            reconfirmarla antes de las 12 horas previas a la salida o se liberará el cupo.
          </Card>
        ) : null}
      </div>

      <Card>
        <h3 className="font-semibold text-tinta">Desglose</h3>
        <dl className="mt-2 grid grid-cols-2 gap-3 text-sm tabular sm:grid-cols-4">
          <div>
            <dt className="text-tinta-suave">Tarifa por pasajero</dt>
            <dd className="font-medium text-tinta">{formatUsd(fareUsd)}</dd>
          </div>
          <div>
            <dt className="text-tinta-suave">Tasa de salida por pasajero</dt>
            <dd className="font-medium text-tinta">{formatUsd(taxPerPassenger)}</dd>
          </div>
          <div>
            <dt className="text-tinta-suave">Pasajeros</dt>
            <dd className="font-medium text-tinta">{passengerCount}</dd>
          </div>
          <div>
            <dt className="text-tinta-suave">Total</dt>
            <dd className="text-2xl font-extrabold text-tinta">{formatUsd(total)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-tinta-suave">
          Tarifa total {formatUsd(fareTotal)} + tasa de salida total {formatUsd(taxTotal)}.
        </p>
      </Card>

      {state.error ? (
        <p role="alert" className="text-sm font-medium text-peligro">
          {state.error}
        </p>
      ) : null}

      <StickyActions>
        <button type="button" onClick={onBack} className={buttonClass("secundario", "flex-1")}>
          Atrás
        </button>
        <button
          type="submit"
          disabled={pending || !selectedPaymentMethodId}
          className={buttonClass("primario", "flex-1")}
        >
          {pending ? "Confirmando…" : "Confirmar reserva"}
        </button>
      </StickyActions>
    </form>
  );
}
