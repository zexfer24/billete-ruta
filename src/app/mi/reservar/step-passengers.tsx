"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Card, Field, buttonClass } from "@/components/ui";
import { DepartureRow } from "@/components/departure-row";
import { StickyActions } from "@/components/sticky-actions";
import { isValidBirthYear, isValidIdNumber } from "@/lib/identity";
import { unirseListaEsperaAction, type WaitlistState } from "./actions";
import { toDepartureRowData, type CompanionForm, type DepartureVM } from "./booking-form";

const initialWaitlistState: WaitlistState = { error: null, success: false };

interface StepPassengersProps {
  departure: DepartureVM;
  now: Date;
  maxPassengers: number;
  passengerCount: number;
  onChangeCantidad: (cantidad: number) => void;
  companions: CompanionForm[];
  onChangeCompanion: (indice: number, campo: keyof CompanionForm, valor: string) => void;
  viajaMenor: boolean;
  canContinue: boolean;
  onBack: () => void;
  onNext: () => void;
}

/** Paso 2 del asistente: cantidad de pasajeros, acompañantes, aviso de menor y lista de espera si no hay cupo. */
export function StepPassengers({
  departure,
  now,
  maxPassengers,
  passengerCount,
  onChangeCantidad,
  companions,
  onChangeCompanion,
  viajaMenor,
  canContinue,
  onBack,
  onNext,
}: StepPassengersProps) {
  return (
    <section className="flex flex-col gap-4">
      <DepartureRow departure={toDepartureRowData(departure)} now={now} selected />

      {maxPassengers === 0 ? (
        <WaitlistBlock departureId={departure.id} />
      ) : (
        <>
          <label className="flex max-w-xs flex-col gap-1.5 text-sm">
            <span className="font-medium text-tinta">Cantidad de pasajeros (máximo {maxPassengers})</span>
            <select
              value={passengerCount}
              onChange={(e) => onChangeCantidad(Number.parseInt(e.target.value, 10))}
              className="min-h-11 rounded-xl border border-borde px-4 text-base text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca"
            >
              {Array.from({ length: maxPassengers }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          {companions.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-tinta">Acompañantes</h3>
              {companions.map((c, i) => (
                <Card key={i} className="flex flex-col gap-3">
                  <p className="font-semibold text-tinta">Acompañante {i + 1}</p>
                  <Field
                    label="Nombre completo"
                    name={`companion-${i}-fullName`}
                    value={c.fullName}
                    onChange={(e) => onChangeCompanion(i, "fullName", e.target.value)}
                    autoComplete="off"
                  />
                  <Field
                    label="Cédula"
                    name={`companion-${i}-idNumber`}
                    value={c.idNumber}
                    onChange={(e) => onChangeCompanion(i, "idNumber", e.target.value)}
                    autoCapitalize="characters"
                    autoComplete="off"
                    error={c.idNumber && !isValidIdNumber(c.idNumber) ? "Cédula inválida." : undefined}
                  />
                  <Field
                    label="Año de nacimiento"
                    name={`companion-${i}-birthYear`}
                    value={c.birthYear}
                    onChange={(e) => onChangeCompanion(i, "birthYear", e.target.value)}
                    inputMode="numeric"
                    error={
                      c.birthYear && !isValidBirthYear(Number.parseInt(c.birthYear, 10) || 0)
                        ? "Año inválido."
                        : undefined
                    }
                  />
                </Card>
              ))}
            </div>
          ) : null}

          {viajaMenor ? (
            <Card className="border border-alerta text-sm text-alerta">
              Viaja un menor de edad: recuerda cargar el permiso de viaje en{" "}
              <Link href="/mi/documentos" className="font-semibold underline">
                Documentos
              </Link>
              .
            </Card>
          ) : null}
        </>
      )}

      <StickyActions>
        <button type="button" onClick={onBack} className={buttonClass("secundario", "flex-1")}>
          Atrás
        </button>
        <button
          type="button"
          disabled={!canContinue}
          onClick={onNext}
          className={buttonClass("primario", "flex-1")}
        >
          Continuar
        </button>
      </StickyActions>
    </section>
  );
}

function WaitlistBlock({ departureId }: { departureId: string }) {
  const [state, formAction, pending] = useActionState(unirseListaEsperaAction, initialWaitlistState);

  if (state.success) {
    return (
      <Card className="border border-exito text-sm text-exito">
        Te anotamos en la lista de espera. Te avisaremos si se libera un puesto.
      </Card>
    );
  }

  return (
    <form action={formAction}>
      <Card className="flex flex-col gap-3 border border-alerta">
        <input type="hidden" name="departureId" value={departureId} />
        <p className="text-sm text-alerta">
          Esta salida no tiene cupo disponible en este momento. Puedes anotarte en la lista de
          espera.
        </p>
        <label className="flex max-w-xs flex-col gap-1.5 text-sm">
          <span className="font-medium text-tinta">Cantidad de pasajeros</span>
          <select
            name="passengerCount"
            defaultValue={1}
            className="min-h-11 rounded-xl border border-borde px-4 text-base text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pending} className={buttonClass("primario")}>
          {pending ? "Enviando…" : "Unirme a la lista de espera"}
        </button>
        {state.error ? (
          <p role="alert" className="text-sm font-medium text-peligro">
            {state.error}
          </p>
        ) : null}
      </Card>
    </form>
  );
}
