"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { isMinor, isValidBirthYear, isValidIdNumber } from "@/lib/identity";
import {
  crearReservaAction,
  unirseListaEsperaAction,
  type CrearReservaState,
  type WaitlistState,
} from "./actions";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

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

interface CompanionForm {
  fullName: string;
  idNumber: string;
  birthYear: string;
}

const CASH_MIN_LEAD_HOURS = 12;

function formatUsd(value: number): string {
  return `$ ${value.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function emptyCompanion(): CompanionForm {
  return { fullName: "", idNumber: "", birthYear: "" };
}

const initialCrearState: CrearReservaState = { error: null };
const initialWaitlistState: WaitlistState = { error: null, success: false };

export default function BookingForm({
  departures,
  origins,
  destinations,
  paymentMethodsByAgency,
  taxPerPassengerUsd,
  passenger,
  initialDepartureId,
  initialPassengerCount,
}: {
  departures: DepartureVM[];
  origins: string[];
  destinations: string[];
  paymentMethodsByAgency: Record<string, PaymentMethodVM[]>;
  taxPerPassengerUsd: string;
  passenger: { fullName: string; birthYear: number };
  initialDepartureId?: string;
  initialPassengerCount?: number;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [filterOrigin, setFilterOrigin] = useState("");
  const [filterDestination, setFilterDestination] = useState("");
  const [selectedDepartureId, setSelectedDepartureId] = useState<string | null>(
    initialDepartureId ?? null,
  );
  const [passengerCount, setPassengerCount] = useState(
    Math.min(6, Math.max(1, initialPassengerCount ?? 1)),
  );
  const [companions, setCompanions] = useState<CompanionForm[]>([]);
  const [policiesAccepted, setPoliciesAccepted] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);

  const tax = Number.parseFloat(taxPerPassengerUsd);

  const filteredDepartures = useMemo(() => {
    return departures.filter((d) => {
      const coincideOrigen = filterOrigin ? d.origin === filterOrigin : true;
      const coincideDestino = filterDestination ? d.destination === filterDestination : true;
      return coincideOrigen && coincideDestino;
    });
  }, [departures, filterOrigin, filterDestination]);

  const selectedDeparture = useMemo(
    () => departures.find((d) => d.id === selectedDepartureId) ?? null,
    [departures, selectedDepartureId],
  );

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
    ? (new Date(selectedDeparture.departsAtIso).getTime() - Date.now()) / 3_600_000
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
    setCompanions((prev) =>
      prev.map((c, i) => (i === indice ? { ...c, [campo]: valor } : c)),
    );
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
    <div className="flex flex-col gap-6">
      <ol className="flex flex-wrap gap-2 text-sm">
        {(["Salida", "Pasajeros", "Políticas", "Pago"] as const).map((etiqueta, i) => (
          <li
            key={etiqueta}
            className={`rounded-full px-3 py-1 ${
              step === i + 1
                ? "bg-[var(--color-acento)] text-white"
                : "bg-[var(--color-acento-suave)] text-[var(--color-texto-suave)]"
            }`}
          >
            {i + 1}. {etiqueta}
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Origen</span>
              <select
                value={filterOrigin}
                onChange={(e) => setFilterOrigin(e.target.value)}
                className="rounded-lg border border-[var(--color-borde)] px-3 py-2"
              >
                <option value="">Todos</option>
                {origins.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Destino</span>
              <select
                value={filterDestination}
                onChange={(e) => setFilterDestination(e.target.value)}
                className="rounded-lg border border-[var(--color-borde)] px-3 py-2"
              >
                <option value="">Todos</option>
                {destinations.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {filteredDepartures.length === 0 ? (
            <p className="text-sm text-[var(--color-texto-suave)]">
              No hay salidas que coincidan con ese filtro.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {filteredDepartures.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4"
                >
                  <div>
                    <p className="font-medium">
                      {d.origin} → {d.destination}
                    </p>
                    <p className="text-sm text-[var(--color-texto-suave)]">
                      {d.agencyName} · {d.routeName}
                    </p>
                    <p className="tabular text-sm text-[var(--color-texto-suave)]">
                      Salida: {d.departsAtLabel}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular font-medium">{formatUsd(Number.parseFloat(d.fareUsd))}</p>
                    <p
                      className={`tabular text-sm ${
                        d.available > 0
                          ? "text-[var(--color-texto-suave)]"
                          : "text-[var(--color-peligro)]"
                      }`}
                    >
                      {d.available > 0 ? `${d.available} cupos disponibles` : "Sin cupo"}
                    </p>
                    <button
                      type="button"
                      onClick={() => elegirSalida(d.id)}
                      className="mt-2 rounded-lg bg-[var(--color-acento)] px-4 py-2 text-sm font-medium text-white"
                    >
                      Elegir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {step === 2 && selectedDeparture ? (
        <section className="flex flex-col gap-4">
          <ResumenSalida departure={selectedDeparture} />

          {maxPassengers === 0 ? (
            <WaitlistBlock departureId={selectedDeparture.id} />
          ) : (
            <>
              <label className="flex max-w-xs flex-col gap-1 text-sm">
                <span className="font-medium">Cantidad de pasajeros (máximo {maxPassengers})</span>
                <select
                  value={passengerCount}
                  onChange={(e) => cambiarCantidad(Number.parseInt(e.target.value, 10))}
                  className="rounded-lg border border-[var(--color-borde)] px-3 py-2"
                >
                  {Array.from({ length: maxPassengers }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>

              {companions.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <h3 className="font-medium">Acompañantes</h3>
                  {companions.map((c, i) => (
                    <div
                      key={i}
                      className="grid gap-3 rounded-lg border border-[var(--color-borde)] p-3 sm:grid-cols-3"
                    >
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium">Nombre completo</span>
                        <input
                          value={c.fullName}
                          onChange={(e) => actualizarAcompanante(i, "fullName", e.target.value)}
                          className="rounded-lg border border-[var(--color-borde)] px-3 py-2"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium">Cédula</span>
                        <input
                          value={c.idNumber}
                          onChange={(e) => actualizarAcompanante(i, "idNumber", e.target.value)}
                          className="rounded-lg border border-[var(--color-borde)] px-3 py-2"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium">Año de nacimiento</span>
                        <input
                          type="number"
                          value={c.birthYear}
                          onChange={(e) => actualizarAcompanante(i, "birthYear", e.target.value)}
                          className="rounded-lg border border-[var(--color-borde)] px-3 py-2"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              ) : null}

              {viajaMenor ? (
                <p className="rounded-lg border border-[var(--color-alerta)] bg-[var(--color-superficie)] px-4 py-3 text-sm text-[var(--color-alerta)]">
                  Viaja un menor de edad: recuerda cargar el permiso de viaje en{" "}
                  <Link href="/mi/documentos" className="font-medium underline">
                    Documentos
                  </Link>
                  .
                </p>
              ) : null}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-lg border border-[var(--color-borde)] px-5 py-3 font-medium"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  disabled={!paso2Valido}
                  onClick={() => setStep(3)}
                  className="rounded-lg bg-[var(--color-acento)] px-5 py-3 font-medium text-white disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </>
          )}
        </section>
      ) : null}

      {step === 3 && selectedDeparture ? (
        <section className="flex flex-col gap-4">
          <ResumenSalida departure={selectedDeparture} />
          <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4 text-sm text-[var(--color-texto-suave)]">
            <p>
              Al reservar aceptas que el puesto se libera automáticamente si no registras ningún
              pago dentro de las dos horas siguientes a la creación de la reserva, o si elegiste
              pago en sitio y no reconfirmas hasta 12 horas antes de la salida. El ticket digital
              se emite únicamente cuando el saldo de la reserva llega a cero. Tus datos personales
              y los de tus acompañantes se usan solo para gestionar esta reserva, verificar tu
              identidad en el terminal y comunicarte novedades del viaje; no se comparten con
              terceros ajenos a la operación del terminal.
            </p>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={policiesAccepted}
              onChange={(e) => setPoliciesAccepted(e.target.checked)}
              className="mt-1"
            />
            <span>
              He leído y acepto las políticas de cancelación, liberación de cupo y manejo de mis
              datos personales.
            </span>
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg border border-[var(--color-borde)] px-5 py-3 font-medium"
            >
              Atrás
            </button>
            <button
              type="button"
              disabled={!policiesAccepted}
              onClick={() => setStep(4)}
              className="rounded-lg bg-[var(--color-acento)] px-5 py-3 font-medium text-white disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </section>
      ) : null}

      {step === 4 && selectedDeparture ? (
        <PagoStep
          departure={selectedDeparture}
          availableMethods={availableMethods}
          selectedMethod={selectedMethod}
          selectedPaymentMethodId={selectedPaymentMethodId}
          setSelectedPaymentMethodId={setSelectedPaymentMethodId}
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

function ResumenSalida({ departure }: { departure: DepartureVM }) {
  return (
    <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4">
      <p className="font-medium">
        {departure.origin} → {departure.destination}
      </p>
      <p className="text-sm text-[var(--color-texto-suave)]">
        {departure.agencyName} · {departure.routeName}
      </p>
      <p className="tabular text-sm text-[var(--color-texto-suave)]">
        Salida: {departure.departsAtLabel} · Punto de encuentro: {departure.meetingPoint}
      </p>
    </div>
  );
}

function WaitlistBlock({ departureId }: { departureId: string }) {
  const [state, formAction, pending] = useActionState(
    unirseListaEsperaAction,
    initialWaitlistState,
  );

  if (state.success) {
    return (
      <p className="rounded-lg border border-[var(--color-exito)] bg-[var(--color-superficie)] px-4 py-3 text-sm text-[var(--color-exito)]">
        Te anotamos en la lista de espera. Te avisaremos si se libera un puesto.
      </p>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-alerta)] bg-[var(--color-superficie)] p-4"
    >
      <input type="hidden" name="departureId" value={departureId} />
      <p className="w-full text-sm text-[var(--color-alerta)]">
        Esta salida no tiene cupo disponible en este momento. Puedes anotarte en la lista de
        espera.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Cantidad de pasajeros</span>
        <select
          name="passengerCount"
          defaultValue={1}
          className="rounded-lg border border-[var(--color-borde)] px-3 py-2"
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--color-alerta)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Unirme a la lista de espera"}
      </button>
      {state.error ? (
        <p className="w-full text-sm text-[var(--color-peligro)]">{state.error}</p>
      ) : null}
    </form>
  );
}

function PagoStep({
  departure,
  availableMethods,
  selectedMethod,
  selectedPaymentMethodId,
  setSelectedPaymentMethodId,
  passengerCount,
  fareUsd,
  fareTotal,
  taxPerPassenger,
  taxTotal,
  total,
  companions,
  policiesAccepted,
  onBack,
}: {
  departure: DepartureVM;
  availableMethods: PaymentMethodVM[];
  selectedMethod: PaymentMethodVM | null;
  selectedPaymentMethodId: string | null;
  setSelectedPaymentMethodId: (id: string) => void;
  passengerCount: number;
  fareUsd: number;
  fareTotal: number;
  taxPerPassenger: number;
  taxTotal: number;
  total: number;
  companions: CompanionForm[];
  policiesAccepted: boolean;
  onBack: () => void;
}) {
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

      <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4">
        <h3 className="font-semibold">Desglose</h3>
        <dl className="mt-2 grid grid-cols-2 gap-1 text-sm tabular sm:grid-cols-4">
          <div>
            <dt className="text-[var(--color-texto-suave)]">Tarifa por pasajero</dt>
            <dd>{formatUsd(fareUsd)}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-texto-suave)]">Tasa de salida por pasajero</dt>
            <dd>{formatUsd(taxPerPassenger)}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-texto-suave)]">Pasajeros</dt>
            <dd>{passengerCount}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-texto-suave)]">Total</dt>
            <dd className="font-semibold">{formatUsd(total)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-[var(--color-texto-suave)]">
          Tarifa total {formatUsd(fareTotal)} + tasa de salida total {formatUsd(taxTotal)}.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-semibold">Método de pago</h3>
        {availableMethods.length === 0 ? (
          <p className="text-sm text-[var(--color-texto-suave)]">
            No hay métodos de pago disponibles para esta salida.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {availableMethods.map((m) => (
              <li key={m.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                    selectedPaymentMethodId === m.id
                      ? "border-[var(--color-acento)] bg-[var(--color-acento-suave)]"
                      : "border-[var(--color-borde)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethodId"
                    value={m.id}
                    checked={selectedPaymentMethodId === m.id}
                    onChange={() => setSelectedPaymentMethodId(m.id)}
                  />
                  <span className="font-medium">{m.name}</span>
                  <span className="text-sm text-[var(--color-texto-suave)]">
                    {m.kind === "DIGITAL" ? `Pago digital · ${m.currency}` : "Pago en sitio"}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        {selectedMethod && selectedMethod.kind === "DIGITAL" ? (
          <div className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-acento-suave)] p-3 text-sm">
            <p className="font-medium">Datos de cobro</p>
            <DetailsView value={selectedMethod.details} />
          </div>
        ) : null}

        {selectedMethod && selectedMethod.kind === "FISICO" ? (
          <p className="rounded-lg border border-[var(--color-alerta)] bg-[var(--color-superficie)] px-4 py-3 text-sm text-[var(--color-alerta)]">
            Tu reserva quedará condicional hasta que la agencia registre el cobro en sitio. Debes
            reconfirmarla antes de las 12 horas previas a la salida o se liberará el cupo.
          </p>
        ) : null}
      </div>

      {state.error ? <p className="text-sm text-[var(--color-peligro)]">{state.error}</p> : null}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-[var(--color-borde)] px-5 py-3 font-medium"
        >
          Atrás
        </button>
        <button
          type="submit"
          disabled={pending || !selectedPaymentMethodId}
          className="rounded-lg bg-[var(--color-acento)] px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Confirmando..." : "Confirmar reserva"}
        </button>
      </div>
    </form>
  );
}

function DetailsView({ value }: { value: JsonValue }) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return (
      <dl className="mt-1 grid grid-cols-1 gap-1">
        {Object.entries(value).map(([key, val]) => (
          <div key={key} className="flex justify-between gap-2">
            <dt className="text-[var(--color-texto-suave)]">{key}</dt>
            <dd className="font-medium">{String(val)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return <p>{String(value)}</p>;
}
