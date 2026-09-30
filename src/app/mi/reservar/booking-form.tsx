"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { isMinor, isValidBirthYear, isValidIdNumber } from "@/lib/identity";
import { Alert } from "@/components/alert";
import type { DepartureRowData } from "@/components/departure-row";
import type { JsonValue } from "@/components/details-view";
import { Stepper } from "@/components/stepper";
import { buttonClass } from "@/components/ui-classes";
import { clearBookingDraft, readBookingDraft, writeBookingDraft } from "./draft";
import { bookingCost, formatCents } from "./money";
import { StepDepartures } from "./step-departures";
import { StepPassengers } from "./step-passengers";
import { StepPolicies } from "./step-policies";
import { StepPayment } from "./step-payment";

export interface DepartureVM {
  id: string;
  routeId: string;
  routeName: string;
  agencyId: string;
  agencyName: string;
  origin: string;
  destination: string;
  meetingPoint: string;
  estimatedMinutes: number;
  departsAtIso: string;
  departsAtLabel: string;
  /** Tarifa por persona con dos decimales, como texto ("12.50"). */
  fareUsd: string;
  capacity: number;
  available: number;
  unitLabel: string | null;
}

export interface PaymentMethodVM {
  id: string;
  agencyId: string | null;
  name: string;
  kind: "DIGITAL" | "FISICO";
  currency: "USD" | "VES" | "COP" | "USDT";
  details: JsonValue;
  sortOrder: number;
}

export interface CompanionForm {
  fullName: string;
  idNumber: string;
  birthYear: string;
}

type Step = 1 | 2 | 3 | 4;

/** Una reserva para pagar en taquilla solo se admite con 12 horas o más antes de salir. */
const CASH_MIN_LEAD_HOURS = 12;
/** Tope de personas por reserva (el titular más cinco acompañantes). */
const MAX_PASSENGERS = 6;
const STEP_LABELS = ["Salida", "Pasajeros", "Condiciones", "Pago"] as const;
const STEP_TITLES: Record<Step, string> = {
  1: "Elige tu salida",
  2: "¿Quiénes viajan?",
  3: "Lee y acepta las condiciones",
  4: "¿Cómo vas a pagar?",
};

export const DOCUMENTS_RETURN_HREF = "/mi/documentos?volver=reservar";

function emptyCompanion(): CompanionForm {
  return { fullName: "", idNumber: "", birthYear: "" };
}

/** Convierte una salida del asistente al formato que espera `DepartureRow`. */
export function toDepartureRowData(d: DepartureVM): DepartureRowData {
  return {
    id: d.id,
    agencyId: d.agencyId,
    agencyName: d.agencyName,
    origin: d.origin,
    destination: d.destination,
    departsAt: new Date(d.departsAtIso),
    estimatedMinutes: d.estimatedMinutes,
    fareUsd: d.fareUsd,
    available: d.available,
    capacity: d.capacity,
  };
}

/** Errores de un acompañante, campo por campo; vacío si está completo. */
export function companionErrors(c: CompanionForm): Partial<Record<keyof CompanionForm, string>> {
  const errors: Partial<Record<keyof CompanionForm, string>> = {};
  if (c.fullName.trim().length < 3) errors.fullName = "Escribe el nombre y el apellido.";
  if (!isValidIdNumber(c.idNumber)) {
    errors.idNumber = "Escribe la cédula con la letra y los números, por ejemplo V12345678.";
  }
  if (!isValidBirthYear(Number.parseInt(c.birthYear, 10) || 0) || !/^\d{4}$/.test(c.birthYear.trim())) {
    errors.birthYear = "Escribe el año con cuatro números, por ejemplo 2010.";
  }
  return errors;
}

function passengersText(count: number): string {
  return count === 1 ? "1 pasajero" : `${count} pasajeros`;
}

/**
 * Asistente de reserva de cuatro pasos (spec 7.1): un paso por pantalla con
 * el `Stepper` arriba, el total siempre a la vista en la barra fija de abajo
 * y el avance con un botón grande. Lo elegido se guarda en un borrador de la
 * pestaña (`draft.ts`), así la persona puede ir a Documentos a subir la
 * cédula, o recargar, y seguir donde quedó.
 */
export default function BookingForm({
  departures,
  origins,
  destinations,
  paymentMethodsByAgency,
  taxPerPassengerUsd,
  exchangeRates,
  passenger,
  documents,
  initialOrigin,
  initialDestination,
  initialDepartureId,
  initialPassengerCount,
  nowIso,
}: {
  departures: DepartureVM[];
  origins: string[];
  destinations: string[];
  paymentMethodsByAgency: Record<string, PaymentMethodVM[]>;
  taxPerPassengerUsd: string;
  /** Bolívares y pesos por dólar vigentes, con seis decimales ("36.500000"). */
  exchangeRates: Partial<Record<"VES" | "COP", string>>;
  passenger: { fullName: string; birthYear: number };
  documents: { hasIdDocument: boolean; hasTravelPermit: boolean };
  initialOrigin?: string;
  initialDestination?: string;
  initialDepartureId?: string;
  initialPassengerCount?: number;
  nowIso: string;
}) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const initialDeparture = initialDepartureId
    ? (departures.find((d) => d.id === initialDepartureId) ?? null)
    : null;

  const [step, setStep] = useState<Step>(initialDeparture ? 2 : 1);
  const [origin, setOrigin] = useState(initialOrigin && origins.includes(initialOrigin) ? initialOrigin : "");
  const [destination, setDestination] = useState(
    initialDestination && destinations.includes(initialDestination) ? initialDestination : "",
  );
  const [selectedDepartureId, setSelectedDepartureId] = useState<string | null>(initialDeparture?.id ?? null);
  const [companions, setCompanions] = useState<CompanionForm[]>(() => {
    if (!initialDeparture || !initialPassengerCount) return [];
    const tope = Math.min(MAX_PASSENGERS, Math.max(1, initialDeparture.available));
    const cantidad = Math.min(initialPassengerCount, tope);
    return Array.from({ length: Math.max(0, cantidad - 1) }, emptyCompanion);
  });
  const [policiesAccepted, setPoliciesAccepted] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  // El borrador se lee una sola vez al montar; hasta el render siguiente no se escribe encima.
  const [draftReady, setDraftReady] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const lastStep = useRef<Step>(step);
  const restoredStep = useRef<Step | null>(null);

  useEffect(() => {
    const draft = readBookingDraft();
    setDraftReady(true);
    if (!draft) return;
    const salida = departures.find((d) => d.id === draft.departureId);
    if (!salida) return;
    // Si la persona llegó eligiendo otra salida, esa manda sobre el borrador.
    if (initialDepartureId && initialDepartureId !== draft.departureId) return;
    const tope = Math.min(MAX_PASSENGERS, Math.max(1, salida.available));
    setSelectedDepartureId(salida.id);
    setCompanions(draft.companions.slice(0, tope - 1));
    setPoliciesAccepted(draft.policiesAccepted);
    setSelectedPaymentMethodId(draft.paymentMethodId);
    const pasoRecuperado: Step = salida.available === 0 || draft.step === 1 ? 2 : draft.step;
    // Recuperar no es "cambiar de paso": la vista no salta ni mueve el foco.
    if (pasoRecuperado !== step) restoredStep.current = pasoRecuperado;
    setStep(pasoRecuperado);
    setRestored(true);
    // Solo al montar: el borrador es el de la visita anterior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!draftReady || !selectedDepartureId) return;
    writeBookingDraft({
      step,
      departureId: selectedDepartureId,
      companions,
      policiesAccepted,
      paymentMethodId: selectedPaymentMethodId,
    });
  }, [draftReady, step, selectedDepartureId, companions, policiesAccepted, selectedPaymentMethodId]);

  // Al cambiar de paso, la vista vuelve arriba y el foco va al título del paso nuevo.
  useEffect(() => {
    if (lastStep.current === step) return;
    lastStep.current = step;
    if (restoredStep.current === step) {
      restoredStep.current = null;
      return;
    }
    topRef.current?.scrollIntoView({ block: "start" });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const selectedDeparture = departures.find((d) => d.id === selectedDepartureId) ?? null;
  const maxPassengers = selectedDeparture ? Math.min(MAX_PASSENGERS, selectedDeparture.available) : 0;
  const passengerCount = companions.length + 1;

  const viajaMenor =
    isMinor(passenger.birthYear, now) ||
    companions.some((c) => {
      const year = Number.parseInt(c.birthYear, 10);
      return /^\d{4}$/.test(c.birthYear.trim()) && isValidBirthYear(year, now) && isMinor(year, now);
    });

  const cost = bookingCost(selectedDeparture?.fareUsd ?? "0", taxPerPassengerUsd, passengerCount);

  const hoursUntilDeparture = selectedDeparture
    ? (new Date(selectedDeparture.departsAtIso).getTime() - now.getTime()) / 3_600_000
    : null;
  const physicalAllowed = hoursUntilDeparture === null || hoursUntilDeparture >= CASH_MIN_LEAD_HOURS;

  const availableMethods = selectedDeparture
    ? (paymentMethodsByAgency[selectedDeparture.agencyId] ?? []).filter(
        (m) => m.kind === "DIGITAL" || physicalAllowed,
      )
    : [];
  const selectedMethod = availableMethods.find((m) => m.id === selectedPaymentMethodId) ?? null;

  function goTo(next: Step) {
    setStep(next);
  }

  function elegirSalida(id: string) {
    const salida = departures.find((d) => d.id === id);
    const tope = salida ? Math.min(MAX_PASSENGERS, Math.max(1, salida.available)) : 1;
    setSelectedDepartureId(id);
    setSelectedPaymentMethodId(null);
    setCompanions((prev) => prev.slice(0, tope - 1));
    goTo(2);
  }

  function empezarDeNuevo() {
    clearBookingDraft();
    setSelectedDepartureId(null);
    setCompanions([]);
    setPoliciesAccepted(false);
    setSelectedPaymentMethodId(null);
    setRestored(false);
    goTo(1);
  }

  const summary = selectedDeparture ? (
    <p className="tabular flex flex-wrap items-baseline justify-between gap-x-3">
      <span>
        {passengersText(passengerCount)}, con la tasa del terminal
      </span>
      <span className="text-base text-tinta">
        Total <strong className="font-bold">{formatCents(cost.totalCents, "USD")}</strong>
      </span>
    </p>
  ) : null;

  return (
    <div ref={topRef} className="flex scroll-mt-4 flex-col gap-6 pb-40">
      <Stepper steps={STEP_LABELS} current={step} label="Pasos para reservar" />

      {restored ? (
        <Alert
          tone="info"
          title="Seguimos con tu reserva en curso"
          action={
            <button type="button" onClick={empezarDeNuevo} className={buttonClass("fantasma", undefined, "sm")}>
              Empezar de nuevo
            </button>
          }
        >
          Guardamos lo que ya habías elegido. Puedes seguir desde aquí.
        </Alert>
      ) : null}

      {!documents.hasIdDocument ? (
        <Alert
          tone="alerta"
          role="none"
          title="Antes de confirmar, sube la foto de tu cédula"
          action={
            <Link href={DOCUMENTS_RETURN_HREF} className={buttonClass("secundario", undefined, "sm")}>
              Subir la foto
            </Link>
          }
        >
          Sin ella no podemos confirmar tu reserva. Lo que elijas aquí queda guardado mientras la subes.
        </Alert>
      ) : null}

      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-xl font-bold tracking-tight text-tinta outline-none"
      >
        <span className="sr-only">
          Paso {step} de {STEP_LABELS.length}:{" "}
        </span>
        {STEP_TITLES[step]}
      </h2>

      {step === 1 ? (
        <StepDepartures
          departures={departures}
          origins={origins}
          destinations={destinations}
          origin={origin}
          destination={destination}
          onChangeFilters={(next) => {
            setOrigin(next.origin);
            setDestination(next.destination);
          }}
          now={now}
          selectedDepartureId={selectedDepartureId}
          taxPerPassengerUsd={taxPerPassengerUsd}
          onSelect={elegirSalida}
        />
      ) : null}

      {step === 2 && selectedDeparture ? (
        <StepPassengers
          departure={selectedDeparture}
          now={now}
          maxPassengers={maxPassengers}
          holderName={passenger.fullName}
          companions={companions}
          onChangeCompanions={setCompanions}
          viajaMenor={viajaMenor}
          hasTravelPermit={documents.hasTravelPermit}
          summary={summary}
          onChangeDeparture={() => goTo(1)}
          onBack={() => goTo(1)}
          onNext={() => goTo(3)}
        />
      ) : null}

      {step === 3 && selectedDeparture ? (
        <StepPolicies
          accepted={policiesAccepted}
          onChangeAccepted={setPoliciesAccepted}
          summary={summary}
          onBack={() => goTo(2)}
          onNext={() => goTo(4)}
        />
      ) : null}

      {step === 4 && selectedDeparture ? (
        <StepPayment
          departure={selectedDeparture}
          now={now}
          availableMethods={availableMethods}
          physicalAllowed={physicalAllowed}
          selectedMethod={selectedMethod}
          onChangePaymentMethod={setSelectedPaymentMethodId}
          passengerCount={passengerCount}
          cost={cost}
          exchangeRates={exchangeRates}
          companions={companions}
          policiesAccepted={policiesAccepted}
          summary={summary}
          onBack={() => goTo(3)}
          onGoToStep={goTo}
        />
      ) : null}

      {step > 1 && !selectedDeparture ? (
        <Alert
          tone="alerta"
          title="Esa salida ya no está disponible"
          action={
            <button type="button" onClick={() => goTo(1)} className={buttonClass("primario", undefined, "sm")}>
              Elegir otra salida
            </button>
          }
        >
          Puede que se haya llenado o que ya haya salido.
        </Alert>
      ) : null}
    </div>
  );
}
