"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type RefObject } from "react";
import type { Currency } from "@prisma/client";
import type { CounterHolderLookup } from "@/modules/counter";
import { isMinor, isValidBirthYear } from "@/lib/identity";
import { formatCaracasDateTime24 } from "@/lib/time";
import { PanelFeedback } from "@/components/panel-feedback";
import { IconCheck } from "@/components/icons";
import { lookupHolderAction, quoteSaleAction, sellAtCounterAction, type CounterSaleState } from "./actions";
import { StepDeparture } from "./step-departure";
import { StepHolder } from "./step-holder";
import {
  StepCompanions,
  companionIsValid,
  emptyCompanion,
  MAX_COMPANIONS,
  type CompanionFormState,
} from "./step-companions";
import { StepPayment, formatAmount, taquillaButtonClass, type QuoteResult } from "./step-payment";
import { changeFromReceived } from "./change";

export interface DepartureOption {
  id: string;
  routeName: string;
  origin: string;
  destination: string;
  departsAtIso: string;
  available: number;
  fareUsd: string;
}

export interface PaymentMethodOption {
  id: string;
  name: string;
  currency: Currency;
  rateFromUsd: string | null;
}

type Step = 1 | 2 | 3 | 4;
type SaleData = Extract<CounterSaleState, { status: "success" }>["sale"];

const STEP_TITLES: Record<Step, string> = {
  1: "Elige la salida",
  2: "Busca o registra al titular",
  3: "Acompañantes y políticas",
  4: "Cobro",
};

const INITIAL_STATE: CounterSaleState = { status: "idle" };

/** Asistente de venta en taquilla de 4 pasos. Mantiene un único formulario para no perder los archivos elegidos al cambiar de paso. */
export default function CounterSaleForm({
  departures,
  paymentMethods,
}: {
  departures: DepartureOption[];
  paymentMethods: PaymentMethodOption[];
}) {
  const [formKey, setFormKey] = useState(0);
  return (
    <Wizard
      key={formKey}
      departures={departures}
      paymentMethods={paymentMethods}
      onReset={() => setFormKey((k) => k + 1)}
    />
  );
}

function Wizard({
  departures,
  paymentMethods,
  onReset,
}: {
  departures: DepartureOption[];
  paymentMethods: PaymentMethodOption[];
  onReset: () => void;
}) {
  const [state, formAction, pending] = useActionState(sellAtCounterAction, INITIAL_STATE);

  const [step, setStep] = useState<Step>(1);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Paso 1
  const [departureId, setDepartureId] = useState<string | null>(null);

  // Paso 2
  const [holderIdNumber, setHolderIdNumber] = useState("");
  const [lookupResult, setLookupResult] = useState<CounterHolderLookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupPending, startLookupTransition] = useTransition();
  const [holderGivenNames, setHolderGivenNames] = useState("");
  const [holderSurnames, setHolderSurnames] = useState("");
  const [holderPhone, setHolderPhone] = useState("");
  const [holderBirthYear, setHolderBirthYear] = useState("");
  const [hasCedulaFile, setHasCedulaFile] = useState(false);

  // Paso 3
  const [companions, setCompanions] = useState<CompanionFormState[]>([]);
  const [hasTravelPermitFile, setHasTravelPermitFile] = useState(false);
  const [policiesAccepted, setPoliciesAccepted] = useState(false);

  // Paso 4
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quotePending, startQuoteTransition] = useTransition();
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (state.status === "error") {
      errorRef.current?.focus();
    }
  }, [state]);

  function onChangeHolderIdNumber(value: string) {
    setHolderIdNumber(value);
    // Cambiar la cédula invalida la búsqueda anterior.
    setLookupResult(null);
    setLookupError(null);
  }

  function buscarTitular() {
    const valor = holderIdNumber.trim();
    if (!valor) return;
    setLookupError(null);
    startLookupTransition(async () => {
      const resultado = await lookupHolderAction(valor);
      if (resultado.ok) {
        setLookupResult(resultado.result);
      } else {
        setLookupResult(null);
        setLookupError(resultado.error);
      }
    });
  }

  const needsCedulaFile = lookupResult === null || !lookupResult.found || !lookupResult.hasCedula;

  const nuevaCuentaValida =
    holderGivenNames.trim().length >= 2 &&
    holderSurnames.trim().length >= 2 &&
    holderPhone.trim().length > 0 &&
    /^\d{4}$/.test(holderBirthYear.trim()) &&
    isValidBirthYear(Number.parseInt(holderBirthYear.trim(), 10));

  const paso2Valido =
    lookupResult !== null &&
    (lookupResult.found || nuevaCuentaValida) &&
    (!needsCedulaFile || hasCedulaFile);

  const holderBirthYearNum = Number.parseInt(holderBirthYear.trim(), 10);
  const holderIsMinor = lookupResult?.found
    ? lookupResult.holderIsMinor
    : Number.isInteger(holderBirthYearNum) && isMinor(holderBirthYearNum);

  const someoneIsMinor =
    holderIsMinor ||
    companions.some((c) => {
      const year = Number.parseInt(c.birthYear.trim(), 10);
      return Number.isInteger(year) && isMinor(year);
    });

  const hasTravelPermitAlready = lookupResult?.found ? lookupResult.hasTravelPermit : false;
  const needsTravelPermitFile = someoneIsMinor && !hasTravelPermitAlready;

  const companionsValid = companions.every(companionIsValid);
  const paso3Valido = companionsValid && (!needsTravelPermitFile || hasTravelPermitFile) && policiesAccepted;

  const passengerCount = 1 + companions.length;

  useEffect(() => {
    if (step === 4 && !paymentMethodId && paymentMethods.length > 0) {
      setPaymentMethodId(paymentMethods[0]!.id);
    }
  }, [step, paymentMethods, paymentMethodId]);

  useEffect(() => {
    if (step !== 4 || !departureId || !paymentMethodId) return;
    setQuote(null);
    setQuoteError(null);
    startQuoteTransition(async () => {
      const resultado = await quoteSaleAction({ departureId, paymentMethodId, passengerCount });
      if (resultado.ok) {
        setQuote(resultado.quote);
      } else {
        setQuoteError(resultado.error);
      }
    });
  }, [step, departureId, paymentMethodId, passengerCount]);

  const changeResult = quote ? changeFromReceived(receivedAmount, quote.amountInCurrency) : null;

  const stepValid = step === 1 ? departureId !== null : step === 2 ? paso2Valido : step === 3 ? paso3Valido : true;

  const helperText =
    step === 1 && !departureId
      ? "Elige una salida para continuar."
      : step === 2 && !paso2Valido
        ? "Busca al titular y completa sus datos para continuar."
        : step === 3 && !paso3Valido
          ? "Completa los acompañantes, el permiso de viaje si hace falta y acepta las políticas para continuar."
          : null;

  function goBack() {
    setConfirmOpen(false);
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  function goNext() {
    if (step < 4 && stepValid) setStep((s) => (s + 1) as Step);
  }

  function addCompanion() {
    setCompanions((prev) => (prev.length < MAX_COMPANIONS ? [...prev, emptyCompanion()] : prev));
  }

  function removeCompanion(index: number) {
    setCompanions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCompanion(index: number, field: keyof CompanionFormState, value: string) {
    setCompanions((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  }

  /**
   * Cambiar de método de pago puede cambiar la moneda: el "Recibido" que haya
   * escrito el operador queda en la moneda anterior, así que se limpia aquí
   * mismo (no en un efecto sobre `quote`, que también recarga al cambiar la
   * cantidad de acompañantes con el mismo método y no debería borrar lo que
   * el operador ya escribió).
   */
  function selectPaymentMethod(id: string) {
    setPaymentMethodId(id);
    setReceivedAmount("");
  }

  if (state.status === "success") {
    return <SaleResult sale={state.sale} onReset={onReset} />;
  }

  const companionsPayload = JSON.stringify(
    companions.map((c) => ({
      fullName: c.fullName.trim(),
      idNumber: c.idNumber.trim(),
      birthYear: Number.parseInt(c.birthYear.trim(), 10),
    })),
  );

  return (
    <form action={formAction} className="flex flex-col gap-6 pb-4">
      <input type="hidden" name="holderIdNumber" value={holderIdNumber} />
      <input type="hidden" name="holderGivenNames" value={lookupResult?.found ? "" : holderGivenNames} />
      <input type="hidden" name="holderSurnames" value={lookupResult?.found ? "" : holderSurnames} />
      <input type="hidden" name="holderPhone" value={lookupResult?.found ? "" : holderPhone} />
      <input type="hidden" name="holderBirthYear" value={lookupResult?.found ? "" : holderBirthYear} />
      <input type="hidden" name="companions" value={companionsPayload} />
      <input type="hidden" name="policiesAccepted" value={policiesAccepted ? "on" : ""} />

      <WizardHeader step={step} title={STEP_TITLES[step]} headingRef={headingRef} />

      <div hidden={step !== 1}>
        <StepDeparture departures={departures} selectedId={departureId} onSelect={setDepartureId} />
      </div>

      <div hidden={step !== 2}>
        <StepHolder
          idNumber={holderIdNumber}
          onChangeIdNumber={onChangeHolderIdNumber}
          onSearch={buscarTitular}
          searching={lookupPending}
          searchError={lookupError}
          result={lookupResult}
          needsCedulaFile={needsCedulaFile}
          hasCedulaFile={hasCedulaFile}
          onChangeCedulaFile={(file) => setHasCedulaFile(file !== null)}
          givenNames={holderGivenNames}
          onChangeGivenNames={setHolderGivenNames}
          surnames={holderSurnames}
          onChangeSurnames={setHolderSurnames}
          phone={holderPhone}
          onChangePhone={setHolderPhone}
          birthYear={holderBirthYear}
          onChangeBirthYear={setHolderBirthYear}
        />
      </div>

      <div hidden={step !== 3}>
        <StepCompanions
          companions={companions}
          onChangeCompanion={updateCompanion}
          onAdd={addCompanion}
          onRemove={removeCompanion}
          needsTravelPermitFile={needsTravelPermitFile}
          hasTravelPermitFile={hasTravelPermitFile}
          onChangeTravelPermitFile={(file) => setHasTravelPermitFile(file !== null)}
          policiesAccepted={policiesAccepted}
          onChangePoliciesAccepted={setPoliciesAccepted}
        />
      </div>

      <div hidden={step !== 4} className="flex flex-col gap-4">
        {state.status === "error" ? (
          <div ref={errorRef} tabIndex={-1} className="outline-none">
            <PanelFeedback error={state.error} />
          </div>
        ) : null}
        <StepPayment
          paymentMethods={paymentMethods}
          selectedId={paymentMethodId}
          onSelect={selectPaymentMethod}
          quote={quote}
          quotePending={quotePending}
          quoteError={quoteError}
          receivedAmount={receivedAmount}
          onChangeReceived={setReceivedAmount}
          changeResult={changeResult}
          confirmOpen={confirmOpen}
          onOpenConfirm={() => setConfirmOpen(true)}
          onCloseConfirm={() => setConfirmOpen(false)}
          submitting={pending}
        />
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 py-3 sm:mx-0 sm:rounded-b-xl">
        {helperText ? <p className="text-sm text-[var(--color-texto-suave)]">{helperText}</p> : null}
        <div className="flex gap-3">
          {step > 1 && !(step === 4 && confirmOpen) ? (
            <button
              type="button"
              onClick={goBack}
              disabled={pending}
              className={taquillaButtonClass("secundario", "flex-1")}
            >
              Atrás
            </button>
          ) : null}
          {step < 4 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!stepValid}
              className={taquillaButtonClass("primario", "flex-1")}
            >
              Continuar
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

function WizardHeader({
  step,
  title,
  headingRef,
}: {
  step: Step;
  title: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-[var(--color-texto-suave)]">Paso {step} de 4</p>
      <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
        {title}
      </h2>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-borde)]">
        <div
          className="h-full rounded-full bg-[var(--color-acento)] transition-[width] duration-150 motion-reduce:transition-none"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>
    </div>
  );
}

function SaleResult({ sale, onReset }: { sale: SaleData; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-[var(--color-exito)] bg-[var(--color-superficie)] p-6 text-center">
      <IconCheck className="h-10 w-10 text-[var(--color-exito)]" title="Venta registrada" />
      <p className="text-lg font-semibold">Venta registrada</p>
      <p className="tabular text-2xl font-bold">{sale.code}</p>
      <p>{sale.routeName}</p>
      <p className="tabular text-sm text-[var(--color-texto-suave)]">
        {formatCaracasDateTime24(new Date(sale.departsAt))}
      </p>
      <p className="text-lg font-semibold">Total cobrado: {formatAmount(sale.amountCharged, sale.currency)}</p>

      {sale.accountCreated ? (
        <p className="rounded-lg bg-[var(--color-acento-suave)] px-3 py-2 text-sm text-[var(--color-acento)]">
          Cuenta creada en taquilla. Indica al pasajero que active su cuenta en TicketRuta › Crear cuenta, con
          su cédula, teléfono y año de nacimiento.
        </p>
      ) : null}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sale.qrDataUrl} alt={`Código QR del ticket ${sale.code}`} width={200} height={200} />

      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <a
          href={`/api/archivos/${sale.pdfPath}`}
          target="_blank"
          rel="noreferrer"
          className={taquillaButtonClass("secundario", "flex-1")}
        >
          Descargar ticket (PDF)
        </a>
        <button type="button" onClick={onReset} className={taquillaButtonClass("primario", "flex-1")}>
          Nueva venta
        </button>
      </div>
    </div>
  );
}
