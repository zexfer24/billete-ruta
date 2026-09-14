"use client";

import { useMemo, useState } from "react";
import { isMinor, isValidBirthYear, isValidIdNumber } from "@/lib/identity";
import type { DepartureRowData } from "@/components/departure-row";
import type { JsonValue } from "@/components/details-view";
import { StepIndicator } from "./step-indicator";
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

const CASH_MIN_LEAD_HOURS = 12;
const STEP_LABELS = ["Salida", "Pasajeros", "Políticas", "Pago"] as const;

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

/** Asistente de reserva de 4 pasos: estado y reglas de negocio del cliente; renderiza el paso activo. */
export default function BookingForm({
  departures,
  origins,
  destinations,
  paymentMethodsByAgency,
  taxPerPassengerUsd,
  passenger,
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
  passenger: { fullName: string; birthYear: number };
  initialOrigin?: string;
  initialDestination?: string;
  initialDepartureId?: string;
  initialPassengerCount?: number;
  nowIso: string;
}) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [origin, setOrigin] = useState(initialOrigin && origins.includes(initialOrigin) ? initialOrigin : "");
  const [destination, setDestination] = useState(
    initialDestination && destinations.includes(initialDestination) ? initialDestination : "",
  );
  const [selectedDepartureId, setSelectedDepartureId] = useState<string | null>(initialDepartureId ?? null);
  const [passengerCount, setPassengerCount] = useState(Math.min(6, Math.max(1, initialPassengerCount ?? 1)));
  const [companions, setCompanions] = useState<CompanionForm[]>([]);
  const [policiesAccepted, setPoliciesAccepted] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);

  const tax = Number.parseFloat(taxPerPassengerUsd);

  const selectedDeparture =
    useMemo(() => departures.find((d) => d.id === selectedDepartureId), [departures, selectedDepartureId]) ??
    null;

  const maxPassengers = selectedDeparture ? Math.min(6, selectedDeparture.available) : 0;

  const viajaMenor =
    isMinor(passenger.birthYear) ||
    companions.some((c) => {
      const year = Number.parseInt(c.birthYear, 10);
      return Number.isInteger(year) && isMinor(year);
    });

  const fareUsd = selectedDeparture ? Number.parseFloat(selectedDeparture.fareUsd) : 0;
  const fareTotal = fareUsd * passengerCount;
  const taxTotal = tax * passengerCount;
  const total = fareTotal + taxTotal;

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

  function elegirSalida(id: string) {
    setSelectedDepartureId(id);
    setSelectedPaymentMethodId(null);
    const salida = departures.find((d) => d.id === id);
    const tope = salida ? Math.min(6, salida.available) : 1;
    const nuevaCantidad = Math.min(passengerCount, Math.max(1, tope));
    setPassengerCount(nuevaCantidad);
    setCompanions((prev) => ajustarAcompanantes(prev, nuevaCantidad));
    setStep(2);
  }

  function cambiarCantidad(cantidad: number) {
    setPassengerCount(cantidad);
    setCompanions((prev) => ajustarAcompanantes(prev, cantidad));
  }

  function ajustarAcompanantes(prev: CompanionForm[], cantidad: number): CompanionForm[] {
    const necesarios = Math.max(0, cantidad - 1);
    const copia = [...prev];
    while (copia.length < necesarios) copia.push(emptyCompanion());
    copia.length = necesarios;
    return copia;
  }

  function actualizarAcompanante(indice: number, campo: keyof CompanionForm, valor: string) {
    setCompanions((prev) => prev.map((c, i) => (i === indice ? { ...c, [campo]: valor } : c)));
  }

  const paso2Valido =
    selectedDeparture !== null &&
    maxPassengers > 0 &&
    companions.every(
      (c) =>
        c.fullName.trim().length >= 3 &&
        isValidIdNumber(c.idNumber) &&
        isValidBirthYear(Number.parseInt(c.birthYear, 10) || 0),
    );

  return (
    <div className="flex flex-col gap-6 pb-24">
      <StepIndicator step={step} labels={STEP_LABELS} />

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
          onSelect={elegirSalida}
        />
      ) : null}

      {step === 2 && selectedDeparture ? (
        <StepPassengers
          departure={selectedDeparture}
          now={now}
          maxPassengers={maxPassengers}
          passengerCount={passengerCount}
          onChangeCantidad={cambiarCantidad}
          companions={companions}
          onChangeCompanion={actualizarAcompanante}
          viajaMenor={viajaMenor}
          canContinue={paso2Valido}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      ) : null}

      {step === 3 && selectedDeparture ? (
        <StepPolicies
          departure={selectedDeparture}
          now={now}
          accepted={policiesAccepted}
          onChangeAccepted={setPoliciesAccepted}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
        />
      ) : null}

      {step === 4 && selectedDeparture ? (
        <StepPayment
          departure={selectedDeparture}
          now={now}
          availableMethods={availableMethods}
          selectedMethod={selectedMethod}
          selectedPaymentMethodId={selectedPaymentMethodId}
          onChangePaymentMethod={setSelectedPaymentMethodId}
          passengerCount={passengerCount}
          fareUsd={fareUsd}
          fareTotal={fareTotal}
          taxPerPassenger={tax}
          taxTotal={taxTotal}
          total={total}
          companions={companions}
          policiesAccepted={policiesAccepted}
          onBack={() => setStep(3)}
        />
      ) : null}
    </div>
  );
}
