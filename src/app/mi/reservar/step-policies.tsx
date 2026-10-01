"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Alert } from "@/components/alert";
import { DepartureRow } from "@/components/departure-row";
import { IconChevronDown, IconClock, IconShield, IconStore, IconTicket, type IconProps } from "@/components/icons";
import { StickyActions } from "@/components/sticky-actions";
import { Card } from "@/components/ui";
import { buttonClass } from "@/components/ui-classes";
import { toDepartureRowData, type DepartureVM } from "./booking-form";
import { revealAndFocus } from "./reveal";

interface StepPoliciesProps {
  /** Salida elegida: se repite arriba para que se sepa a qué bus corresponde el total. */
  departure: DepartureVM;
  now: Date;
  accepted: boolean;
  onChangeAccepted: (value: boolean) => void;
  summary: ReactNode;
  onBack: () => void;
  onNext: () => void;
}

const CONDICIONES: { Icon: ComponentType<IconProps>; texto: string }[] = [
  { Icon: IconClock, texto: "Si no pagas nada en 2 horas, el puesto se libera para otra persona." },
  { Icon: IconTicket, texto: "Recibes tu ticket con código QR cuando termines de pagar." },
  { Icon: IconStore, texto: "Si pagas en la taquilla, hazlo hasta 12 horas antes de salir." },
  { Icon: IconShield, texto: "Tus datos y los de tus acompañantes solo se usan para este viaje." },
];

/**
 * Paso 3 del asistente: la salida elegida, las condiciones en cuatro frases
 * cortas con icono, el texto completo plegado y la casilla de aceptación.
 * "Continuar" no se deshabilita: si falta marcar la casilla, lo dice, lleva
 * la casilla y el aviso al centro de la zona visible (por encima de las
 * barras fijas) y le da el foco. Cada toque vuelve a hacerlo.
 */
export function StepPolicies({ departure, now, accepted, onChangeAccepted, summary, onBack, onNext }: StepPoliciesProps) {
  // Contador y no booleano: cada toque de "Continuar" sin la casilla vuelve a disparar el efecto.
  const [intentos, setIntentos] = useState(0);
  const checkboxRef = useRef<HTMLInputElement>(null);
  const grupoRef = useRef<HTMLDivElement>(null);
  const falta = intentos > 0 && !accepted;

  // Después del render en que aparece el aviso, para que también quede a la vista.
  useEffect(() => {
    if (intentos === 0 || accepted) return;
    revealAndFocus(grupoRef.current, checkboxRef.current);
    // Solo cuando la persona vuelve a tocar "Continuar".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentos]);

  function continuar() {
    if (accepted) {
      onNext();
      return;
    }
    setIntentos((n) => n + 1);
  }

  return (
    <section className="flex flex-col gap-5">
      <DepartureRow departure={toDepartureRowData(departure)} now={now} selected />

      <Card>
        <ul className="flex flex-col gap-4">
          {CONDICIONES.map(({ Icon, texto }) => (
            <li key={texto} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-50 text-marca-600"
              >
                <Icon className="size-5" />
              </span>
              <span className="pt-2 leading-relaxed text-tinta">{texto}</span>
            </li>
          ))}
        </ul>
      </Card>

      <details className="group rounded-tarjeta border border-borde bg-superficie">
        <summary className="foco flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-tarjeta px-5 py-3 font-semibold text-marca-700">
          Leer las condiciones completas
          <IconChevronDown
            aria-hidden="true"
            className="shrink-0 text-tinta-suave transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <ul className="flex list-disc flex-col gap-2 px-5 pb-5 pl-10 leading-relaxed text-tinta-suave">
          <li>
            El puesto se libera automáticamente si no registras ningún pago dentro de las dos horas
            siguientes a la creación de la reserva.
          </li>
          <li>
            Si eliges pagar en la taquilla, debes pagar hasta 12 horas antes de la salida o se
            liberará el puesto.
          </li>
          <li>El ticket digital se emite únicamente cuando el saldo de la reserva llega a cero.</li>
          <li>
            Tus datos personales y los de tus acompañantes se usan solo para gestionar esta reserva,
            verificar tu identidad en el terminal y comunicarte novedades del viaje; no se comparten
            con terceros ajenos a la operación del terminal.
          </li>
        </ul>
      </details>

      <div ref={grupoRef} className="flex flex-col gap-2">
        <label
          className={[
            "flex min-h-12 cursor-pointer items-start gap-3 rounded-control border-2 bg-superficie p-4",
            falta ? "border-peligro" : accepted ? "border-marca-600" : "border-borde-control",
          ].join(" ")}
        >
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={accepted}
            onChange={(e) => onChangeAccepted(e.target.checked)}
            aria-invalid={falta ? true : undefined}
            aria-describedby={falta ? "condiciones-error" : undefined}
            className="foco mt-0.5 size-6 shrink-0 cursor-pointer accent-marca-600"
          />
          <span className="font-medium leading-relaxed text-tinta">Leí y acepto estas condiciones.</span>
        </label>
        {falta ? (
          <div id="condiciones-error">
            <Alert tone="peligro" title="Falta aceptar las condiciones">
              Marca la casilla para poder seguir.
            </Alert>
          </div>
        ) : null}
      </div>

      <StickyActions summary={summary}>
        <button type="button" onClick={onBack} className={buttonClass("secundario", "shrink-0", "lg")}>
          Atrás
        </button>
        <button type="button" onClick={continuar} className={buttonClass("primario", "flex-1", "lg")}>
          Continuar
        </button>
      </StickyActions>
    </section>
  );
}
