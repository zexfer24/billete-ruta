"use client";

import { Card, buttonClass } from "@/components/ui";
import { DepartureRow } from "@/components/departure-row";
import { StickyActions } from "@/components/sticky-actions";
import { toDepartureRowData, type DepartureVM } from "./booking-form";

interface StepPoliciesProps {
  departure: DepartureVM;
  now: Date;
  accepted: boolean;
  onChangeAccepted: (value: boolean) => void;
  onBack: () => void;
  onNext: () => void;
}

/** Paso 3 del asistente: políticas de liberación de cupo, emisión del ticket y privacidad. */
export function StepPolicies({ departure, now, accepted, onChangeAccepted, onBack, onNext }: StepPoliciesProps) {
  return (
    <section className="flex flex-col gap-4">
      <DepartureRow departure={toDepartureRowData(departure)} now={now} selected />

      <Card>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-tinta-suave">
          <li>
            El puesto se libera automáticamente si no registras ningún pago dentro de las dos
            horas siguientes a la creación de la reserva.
          </li>
          <li>
            Si elegiste pago en sitio, debes reconfirmar la reserva hasta 12 horas antes de la
            salida o se liberará el cupo.
          </li>
          <li>El ticket digital se emite únicamente cuando el saldo de la reserva llega a cero.</li>
          <li>
            Tus datos personales y los de tus acompañantes se usan solo para gestionar esta
            reserva, verificar tu identidad en el terminal y comunicarte novedades del viaje; no
            se comparten con terceros ajenos a la operación del terminal.
          </li>
        </ul>
      </Card>

      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onChangeAccepted(e.target.checked)}
          className="mt-1 h-6 w-6 shrink-0 rounded border-borde accent-marca focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca"
        />
        <span className="text-tinta">
          He leído y acepto las políticas de cancelación, liberación de cupo y manejo de mis datos
          personales.
        </span>
      </label>

      <StickyActions>
        <button type="button" onClick={onBack} className={buttonClass("secundario", "flex-1")}>
          Atrás
        </button>
        <button type="button" disabled={!accepted} onClick={onNext} className={buttonClass("primario", "flex-1")}>
          Continuar
        </button>
      </StickyActions>
    </section>
  );
}
