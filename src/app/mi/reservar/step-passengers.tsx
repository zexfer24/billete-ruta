"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { Alert } from "@/components/alert";
import { DepartureRow } from "@/components/departure-row";
import { IconCheckCircle, IconPlus, IconUser } from "@/components/icons";
import { StickyActions } from "@/components/sticky-actions";
import { SubmitButton } from "@/components/submit-button";
import { Card, Field, Select } from "@/components/ui";
import { buttonClass } from "@/components/ui-classes";
import { unirseListaEsperaAction, type WaitlistState } from "./actions";
import {
  companionErrors,
  DOCUMENTS_RETURN_HREF,
  toDepartureRowData,
  type CompanionForm,
  type DepartureVM,
} from "./booking-form";

const initialWaitlistState: WaitlistState = { error: null, success: false };

const FIELD_NAMES: Record<keyof CompanionForm, string> = {
  fullName: "el nombre",
  idNumber: "la cédula",
  birthYear: "el año de nacimiento",
};

interface StepPassengersProps {
  departure: DepartureVM;
  now: Date;
  maxPassengers: number;
  holderName: string;
  companions: CompanionForm[];
  onChangeCompanions: (next: CompanionForm[]) => void;
  viajaMenor: boolean;
  hasTravelPermit: boolean;
  summary: ReactNode;
  onChangeDeparture: () => void;
  onBack: () => void;
  onNext: () => void;
}

/**
 * Paso 2 del asistente: la persona titular ya cuenta como pasajero 1 y se
 * agregan acompañantes uno por uno. Los errores de un campo aparecen al salir
 * de él o al tocar "Continuar", nunca en cada tecla; "Continuar" no se
 * deshabilita: si falta algo, dice qué y lleva el foco al primer campo.
 * Si la salida no tiene puestos, ofrece la lista de espera.
 */
export function StepPassengers({
  departure,
  now,
  maxPassengers,
  holderName,
  companions,
  onChangeCompanions,
  viajaMenor,
  hasTravelPermit,
  summary,
  onChangeDeparture,
  onBack,
  onNext,
}: StepPassengersProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showAllErrors, setShowAllErrors] = useState(false);

  const errores = companions.map(companionErrors);
  const pendientes = errores.flatMap((campos, indice) =>
    (Object.keys(campos) as (keyof CompanionForm)[]).map((campo) => ({ indice, campo })),
  );
  const puedeAgregar = companions.length + 1 < maxPassengers;

  function fieldKey(indice: number, campo: keyof CompanionForm) {
    return `${indice}-${campo}`;
  }

  function actualizar(indice: number, campo: keyof CompanionForm, valor: string) {
    onChangeCompanions(companions.map((c, i) => (i === indice ? { ...c, [campo]: valor } : c)));
  }

  function agregar() {
    if (!puedeAgregar) return;
    onChangeCompanions([...companions, { fullName: "", idNumber: "", birthYear: "" }]);
    // El foco va al primer campo del acompañante nuevo cuando aparezca.
    const nuevo = companions.length;
    window.setTimeout(() => document.getElementById(`companion-${nuevo}-fullName`)?.focus(), 0);
  }

  function quitar(indice: number) {
    onChangeCompanions(companions.filter((_, i) => i !== indice));
    setTouched({});
  }

  function continuar() {
    if (pendientes.length === 0) {
      onNext();
      return;
    }
    setShowAllErrors(true);
    const primero = pendientes[0]!;
    document.getElementById(`companion-${primero.indice}-${primero.campo}`)?.focus();
  }

  function errorDe(indice: number, campo: keyof CompanionForm): string | undefined {
    const visible = showAllErrors || touched[fieldKey(indice, campo)];
    return visible ? errores[indice]?.[campo] : undefined;
  }

  if (maxPassengers === 0) {
    return (
      <section className="flex flex-col gap-4">
        <DepartureRow departure={toDepartureRowData(departure)} now={now} selected />
        <WaitlistBlock departureId={departure.id} />
        <button type="button" onClick={onChangeDeparture} className={buttonClass("secundario", "w-full")}>
          Elegir otra salida
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <DepartureRow departure={toDepartureRowData(departure)} now={now} selected />
        <button
          type="button"
          onClick={onChangeDeparture}
          className={buttonClass("fantasma", "-ml-2 self-start", "sm")}
        >
          Cambiar la salida
        </button>
      </div>

      <Card className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-50 text-marca-600"
        >
          <IconUser className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-tinta-suave">Pasajero 1 · Tú</p>
          <p className="break-words font-semibold text-tinta">{holderName}</p>
        </div>
        <IconCheckCircle aria-hidden="true" className="size-6 shrink-0 text-exito" />
        <span className="sr-only">Tus datos ya están completos.</span>
      </Card>

      {companions.map((c, i) => (
        <Card key={i} className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-tinta">
              Pasajero {i + 2} · Acompañante
            </h3>
            <button
              type="button"
              onClick={() => quitar(i)}
              aria-label={`Quitar al pasajero ${i + 2}`}
              className={buttonClass("fantasma", "-mr-2", "sm")}
            >
              Quitar
            </button>
          </div>
          <Field
            label="Nombre y apellido"
            id={`companion-${i}-fullName`}
            name={`companion-${i}-fullName`}
            value={c.fullName}
            onChange={(e) => actualizar(i, "fullName", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, [fieldKey(i, "fullName")]: true }))}
            autoComplete="off"
            error={errorDe(i, "fullName")}
          />
          <Field
            label="Cédula"
            id={`companion-${i}-idNumber`}
            name={`companion-${i}-idNumber`}
            value={c.idNumber}
            onChange={(e) => actualizar(i, "idNumber", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, [fieldKey(i, "idNumber")]: true }))}
            autoCapitalize="characters"
            autoComplete="off"
            hint="Con la letra y los números, por ejemplo V12345678."
            error={errorDe(i, "idNumber")}
          />
          <Field
            label="Año de nacimiento"
            id={`companion-${i}-birthYear`}
            name={`companion-${i}-birthYear`}
            value={c.birthYear}
            onChange={(e) => actualizar(i, "birthYear", e.target.value.replace(/\D/g, "").slice(0, 4))}
            onBlur={() => setTouched((t) => ({ ...t, [fieldKey(i, "birthYear")]: true }))}
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            hint="Cuatro números, por ejemplo 2010."
            error={errorDe(i, "birthYear")}
          />
        </Card>
      ))}

      {puedeAgregar ? (
        <button type="button" onClick={agregar} className={buttonClass("secundario", "w-full")}>
          <IconPlus aria-hidden="true" className="size-5" />
          Agregar un acompañante
        </button>
      ) : null}
      <p className="text-sm text-tinta-suave">
        {puedeAgregar
          ? `En esta reserva pueden viajar hasta ${maxPassengers} ${maxPassengers === 1 ? "persona" : "personas"}, contándote a ti.`
          : maxPassengers === 1
            ? "En esta salida queda un solo puesto: el tuyo."
            : `Llegaste al máximo de ${maxPassengers} personas para esta reserva.`}
      </p>

      {viajaMenor ? (
        hasTravelPermit ? (
          <Alert tone="info" role="none" title="Viaja un menor de edad">
            Ya tienes un permiso de viaje guardado en Documentos. Revisa que sea el de este viaje.
          </Alert>
        ) : (
          <Alert
            tone="alerta"
            role="none"
            title="Viaja un menor de edad: falta su permiso de viaje"
            action={
              <Link href={DOCUMENTS_RETURN_HREF} className={buttonClass("secundario", undefined, "sm")}>
                Subir el permiso
              </Link>
            }
          >
            Súbelo antes de confirmar. Lo que ya llenaste queda guardado.
          </Alert>
        )
      ) : null}

      {showAllErrors && pendientes.length > 0 ? (
        <Alert tone="peligro" title="Faltan algunos datos">
          <ul className="list-disc pl-5">
            {pendientes.map(({ indice, campo }) => (
              <li key={fieldKey(indice, campo)}>
                Pasajero {indice + 2}: revisa {FIELD_NAMES[campo]}.
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

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

function WaitlistBlock({ departureId }: { departureId: string }) {
  const [state, formAction] = useActionState(unirseListaEsperaAction, initialWaitlistState);

  if (state.success) {
    return (
      <Alert tone="exito" title="Te anotamos en la lista de espera">
        Si se libera un puesto, te avisaremos en Avisos para que lo reserves.
      </Alert>
    );
  }

  return (
    <form action={formAction}>
      <Card className="flex flex-col gap-4">
        <input type="hidden" name="departureId" value={departureId} />
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold text-tinta">Esta salida no tiene puestos libres</p>
          <p className="leading-relaxed text-tinta-suave">
            Anótate en la lista de espera: si alguien libera su puesto, te avisamos.
          </p>
        </div>
        <Select label="¿Cuántas personas viajan?" name="passengerCount" defaultValue="1">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n === 1 ? "1 persona" : `${n} personas`}
            </option>
          ))}
        </Select>
        {state.error ? (
          <Alert tone="peligro" title="No se pudo anotar">
            {state.error}
          </Alert>
        ) : null}
        <SubmitButton pendingLabel="Anotando…" className={buttonClass("primario", "w-full")}>
          Anotarme en la lista de espera
        </SubmitButton>
      </Card>
    </form>
  );
}
