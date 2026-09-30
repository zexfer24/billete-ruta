"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { Currency } from "@prisma/client";
import type { CounterHolderLookup } from "@/modules/counter";
import { isMinor, isValidBirthYear, isValidPhone, normalizePhone } from "@/lib/identity";
import { formatCaracasDateTime24 } from "@/lib/time";
import { Stepper } from "@/components/stepper";
import { Alert } from "@/components/alert";
import { FieldError } from "@/components/ui";
import { panelButtonClass } from "@/components/panel-ui";
import { IconChevronLeft, IconChevronRight, IconCash } from "@/components/icons";
import { lookupHolderAction, quoteSaleAction, sellAtCounterAction, type CounterSaleState } from "./actions";
import { StepDeparture } from "./step-departure";
import { StepHolder, type NewHolderErrors } from "./step-holder";
import {
  StepCompanions,
  companionIsValid,
  emptyCompanion,
  MAX_COMPANIONS,
  type CompanionFormState,
} from "./step-companions";
import { StepPayment, formatAmount, type QuoteResult } from "./step-payment";
import { ChargeDialog } from "./charge-dialog";
import { SaleResult } from "./sale-result";
import { changeFromReceived } from "./change";
import { COUNTER_STEP_HINTS, COUNTER_STEP_LABELS, COUNTER_STEP_TITLES, type CounterStep } from "./texts";

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

type Step = CounterStep;


/** Tope de cada foto, el mismo que aplica el servidor. */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const INITIAL_STATE: CounterSaleState = { status: "idle" };

/** Una foto cuenta como elegida solo si existe y no supera el tope (si no, el campo ya explica el error). */
function fileIsUsable(file: File | null): boolean {
  return file !== null && file.size > 0 && file.size <= MAX_UPLOAD_BYTES;
}

/** Errores de los datos de un titular nuevo, con las mismas reglas que aplica el servidor. */
function newHolderErrors(data: { givenNames: string; surnames: string; phone: string; birthYear: string }): NewHolderErrors {
  const errores: NewHolderErrors = {};
  if (data.givenNames.trim().length < 2) errores.givenNames = "Escribe los nombres.";
  if (data.surnames.trim().length < 2) errores.surnames = "Escribe los apellidos.";
  if (data.phone.trim() === "") {
    errores.phone = "Escribe el teléfono.";
  } else if (!isValidPhone(normalizePhone(data.phone))) {
    errores.phone = "Revisa el teléfono, por ejemplo 0414 123 4567.";
  }
  const year = Number.parseInt(data.birthYear.trim(), 10);
  if (!/^\d{4}$/.test(data.birthYear.trim()) || !isValidBirthYear(year)) {
    errores.birthYear = "Escribe el año con cuatro números, por ejemplo 1990.";
  }
  return errores;
}

/**
 * Asistente de venta en taquilla de 4 pasos (spec 7.2). Mantiene un único
 * formulario para no perder los archivos elegidos al cambiar de paso. Tras
 * una venta, "Nueva venta" lo vuelve a montar vacío.
 */
export default function CounterSaleForm({
  departures,
  paymentMethods,
  nowIso,
}: {
  departures: DepartureOption[];
  paymentMethods: PaymentMethodOption[];
  nowIso: string;
}) {
  const [formKey, setFormKey] = useState(0);
  return (
    <Wizard
      key={formKey}
      departures={departures}
      paymentMethods={paymentMethods}
      nowIso={nowIso}
      onReset={() => setFormKey((k) => k + 1)}
    />
  );
}

function Wizard({
  departures,
  paymentMethods,
  nowIso,
  onReset,
}: {
  departures: DepartureOption[];
  paymentMethods: PaymentMethodOption[];
  nowIso: string;
  onReset: () => void;
}) {
  const [state, formAction, pending] = useActionState(sellAtCounterAction, INITIAL_STATE);

  const [step, setStep] = useState<Step>(1);
  // Pasos en los que ya se pulsó "Continuar" sin completar: desde ahí se muestran todos sus errores.
  const [attempted, setAttempted] = useState<Step[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

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
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(paymentMethods[0]?.id ?? null);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quotePending, startQuoteTransition] = useTransition();
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Al cambiar de paso, el foco va al título del paso (no en la primera carga).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (state.status === "error") {
      setConfirmOpen(false);
      errorRef.current?.focus();
      // Si el operador ya había elegido un archivo antes de reintentar, las
      // marcas deben reflejar lo que de verdad quedó en los `<input type="file">`.
      const cedulaInput = formRef.current?.querySelector<HTMLInputElement>('input[name="cedula"]');
      const travelPermitInput = formRef.current?.querySelector<HTMLInputElement>('input[name="travelPermit"]');
      setHasCedulaFile(fileIsUsable(cedulaInput?.files?.[0] ?? null));
      setHasTravelPermitFile(fileIsUsable(travelPermitInput?.files?.[0] ?? null));
    }
  }, [state]);

  const needsCedulaFile = lookupResult === null || !lookupResult.found || !lookupResult.hasCedula;
  const showCedulaField = lookupResult !== null && needsCedulaFile;

  const erroresTitular = newHolderErrors({
    givenNames: holderGivenNames,
    surnames: holderSurnames,
    phone: holderPhone,
    birthYear: holderBirthYear,
  });
  const nuevaCuentaValida = Object.keys(erroresTitular).length === 0;

  const holderBirthYearNum = Number.parseInt(holderBirthYear.trim(), 10);
  const holderIsMinor = lookupResult?.found
    ? lookupResult.holderIsMinor
    : /^\d{4}$/.test(holderBirthYear.trim()) && isMinor(holderBirthYearNum);
  const someoneIsMinor =
    holderIsMinor ||
    companions.some((c) => {
      const year = Number.parseInt(c.birthYear.trim(), 10);
      return /^\d{4}$/.test(c.birthYear.trim()) && isMinor(year);
    });
  const hasTravelPermitAlready = lookupResult?.found ? lookupResult.hasTravelPermit : false;
  const needsTravelPermitFile = someoneIsMinor && !hasTravelPermitAlready;

  // Cuando un campo de foto deja de mostrarse, su archivo se pierde: la marca vuelve a "sin foto".
  const [prevShowCedula, setPrevShowCedula] = useState(showCedulaField);
  if (prevShowCedula !== showCedulaField) {
    setPrevShowCedula(showCedulaField);
    if (!showCedulaField) setHasCedulaFile(false);
  }
  const [prevNeedsPermit, setPrevNeedsPermit] = useState(needsTravelPermitFile);
  if (prevNeedsPermit !== needsTravelPermitFile) {
    setPrevNeedsPermit(needsTravelPermitFile);
    if (!needsTravelPermitFile) setHasTravelPermitFile(false);
  }

  const companionsValid = companions.every(companionIsValid);
  const passengerCount = 1 + companions.length;

  // Faltantes de cada paso, en frases cortas: se muestran junto a "Continuar".
  const faltantes: Record<Step, string[]> = {
    1: departureId === null ? ["Elige una salida."] : [],
    2: [
      ...(lookupResult === null ? ["Busca la cédula del titular."] : []),
      ...(lookupResult && !lookupResult.found && !nuevaCuentaValida ? ["Completa los datos del titular."] : []),
      ...(lookupResult && needsCedulaFile && !hasCedulaFile ? ["Toma la foto de la cédula."] : []),
    ],
    3: [
      ...(!companionsValid ? ["Revisa los datos de los acompañantes."] : []),
      ...(needsTravelPermitFile && !hasTravelPermitFile ? ["Toma la foto del permiso de viaje."] : []),
      ...(!policiesAccepted ? ["Marca que el pasajero aceptó las políticas."] : []),
    ],
    4: [],
  };
  const intentado = attempted.includes(step);
  const faltanAhora = faltantes[step];

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
  }, [step, departureId, paymentMethodId, passengerCount, quoteAttempt]);

  const changeResult = quote ? changeFromReceived(receivedAmount, quote.amountInCurrency) : null;
  const faltaDinero = receivedAmount.trim() !== "" && changeResult?.kind === "faltan";
  const recibidoInvalido = receivedAmount.trim() !== "" && changeResult?.kind === "invalido";
  const puedeCobrar = quote !== null && !quotePending && !faltaDinero && !recibidoInvalido && !pending;

  function onChangeHolderIdNumber(value: string) {
    setHolderIdNumber(value);
    // Cambiar la cédula invalida la búsqueda anterior.
    setLookupResult(null);
    setLookupError(null);
  }

  function buscarTitular() {
    const valor = holderIdNumber.trim();
    if (!valor || lookupPending) return;
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

  function goBack() {
    setConfirmOpen(false);
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  function goNext() {
    if (step === 4) return;
    if (faltanAhora.length === 0) {
      setStep((s) => (s + 1) as Step);
      return;
    }
    // El resumen de lo que falta aparece junto al botón y se anuncia con role="alert";
    // el foco se queda en "Continuar" para no perder el lugar.
    setAttempted((prev) => (prev.includes(step) ? prev : [...prev, step]));
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
   * cantidad de acompañantes con el mismo método).
   */
  function selectPaymentMethod(id: string) {
    setPaymentMethodId(id);
    setReceivedAmount("");
  }

  /** Enter en un campo no envía la venta: solo el botón del diálogo de confirmación la envía. */
  function onFormKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
      event.preventDefault();
    }
  }

  /**
   * Envía con `FormData` propio en vez de `<form action={formAction}>`: React
   * 19 ejecuta `form.reset()` al terminar la acción, también cuando devuelve
   * `{status:"error"}`, y eso vacía los `<input type="file">` y desmarca los
   * radios de salida y método de pago antes de que el operador pueda
   * reintentar (ver hallazgo I1 de la ronda 4). Solo se envía desde el
   * diálogo de confirmación del paso 4.
   */
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step !== 4 || !confirmOpen || !quote || pending) return;
    const fd = new FormData(e.currentTarget);
    startTransition(() => {
      formAction(fd);
    });
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

  const salidaElegida = departures.find((d) => d.id === departureId) ?? null;
  const nombreTitular = lookupResult?.found
    ? lookupResult.fullName
    : `${holderGivenNames.trim()} ${holderSurnames.trim()}`.trim();

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onKeyDown={onFormKeyDown}
      noValidate
      className="flex flex-col gap-6"
    >
      <input type="hidden" name="holderIdNumber" value={holderIdNumber} />
      <input type="hidden" name="holderGivenNames" value={lookupResult?.found ? "" : holderGivenNames} />
      <input type="hidden" name="holderSurnames" value={lookupResult?.found ? "" : holderSurnames} />
      <input type="hidden" name="holderPhone" value={lookupResult?.found ? "" : holderPhone} />
      <input type="hidden" name="holderBirthYear" value={lookupResult?.found ? "" : holderBirthYear} />
      <input type="hidden" name="companions" value={companionsPayload} />
      <input type="hidden" name="policiesAccepted" value={policiesAccepted ? "on" : ""} />

      <div className="flex flex-col gap-5 rounded-tarjeta border border-borde bg-superficie p-5 shadow-1">
        <Stepper steps={COUNTER_STEP_LABELS} current={step} label="Pasos de la venta" />
        <div>
          <h2 ref={headingRef} tabIndex={-1} className="text-xl font-bold tracking-tight text-tinta outline-none">
            {COUNTER_STEP_TITLES[step]}
          </h2>
          <p className="mt-1 text-[15px] text-tinta-suave">{COUNTER_STEP_HINTS[step]}</p>
        </div>
      </div>

      <div hidden={step !== 1}>
        <StepDeparture
          departures={departures}
          selectedId={departureId}
          onSelect={setDepartureId}
          nowIso={nowIso}
        />
      </div>

      <div hidden={step !== 2}>
        <StepHolder
          idNumber={holderIdNumber}
          onChangeIdNumber={onChangeHolderIdNumber}
          onSearch={buscarTitular}
          searching={lookupPending}
          searchError={lookupError}
          result={lookupResult}
          showCedulaField={showCedulaField}
          cedulaMissing={attempted.includes(2) && needsCedulaFile && !hasCedulaFile}
          onChangeCedulaFile={(file) => setHasCedulaFile(fileIsUsable(file))}
          givenNames={holderGivenNames}
          onChangeGivenNames={setHolderGivenNames}
          surnames={holderSurnames}
          onChangeSurnames={setHolderSurnames}
          phone={holderPhone}
          onChangePhone={setHolderPhone}
          birthYear={holderBirthYear}
          onChangeBirthYear={setHolderBirthYear}
          errors={
            attempted.includes(2)
              ? erroresTitular
              : {
                  givenNames: holderGivenNames ? erroresTitular.givenNames : undefined,
                  surnames: holderSurnames ? erroresTitular.surnames : undefined,
                  phone: holderPhone ? erroresTitular.phone : undefined,
                  birthYear: holderBirthYear.length >= 4 ? erroresTitular.birthYear : undefined,
                }
          }
          missingSearch={attempted.includes(2) && lookupResult === null && !lookupError}
        />
      </div>

      <div hidden={step !== 3}>
        <StepCompanions
          companions={companions}
          onChangeCompanion={updateCompanion}
          onAdd={addCompanion}
          onRemove={removeCompanion}
          needsTravelPermitFile={needsTravelPermitFile}
          hasTravelPermitAlready={someoneIsMinor && hasTravelPermitAlready}
          travelPermitMissing={attempted.includes(3) && needsTravelPermitFile && !hasTravelPermitFile}
          onChangeTravelPermitFile={(file) => setHasTravelPermitFile(fileIsUsable(file))}
          policiesAccepted={policiesAccepted}
          onChangePoliciesAccepted={setPoliciesAccepted}
          policiesMissing={attempted.includes(3) && !policiesAccepted}
          showErrors={attempted.includes(3)}
        />
      </div>

      <div hidden={step !== 4} className="flex flex-col gap-6">
        {state.status === "error" ? (
          <div ref={errorRef} tabIndex={-1} className="outline-none">
            <Alert tone="peligro" title="No se pudo registrar la venta">
              {state.error} Revisa los datos y vuelve a intentarlo; no se cobró nada.
            </Alert>
          </div>
        ) : null}
        <StepPayment
          paymentMethods={paymentMethods}
          selectedId={paymentMethodId}
          onSelect={selectPaymentMethod}
          quote={quote}
          quotePending={quotePending}
          quoteError={quoteError}
          onRetryQuote={() => setQuoteAttempt((n) => n + 1)}
          receivedAmount={receivedAmount}
          onChangeReceived={setReceivedAmount}
          changeResult={changeResult}
          passengerCount={passengerCount}
        />
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 border-t border-borde bg-superficie px-4 py-3 shadow-2 sm:mx-0 sm:rounded-tarjeta sm:border">
        {intentado && faltanAhora.length > 0 ? (
          <FieldError id="taquilla-faltantes" afterSubmit>
            Para continuar falta: {faltanAhora.join(" ")}
          </FieldError>
        ) : null}
        {step === 4 && faltaDinero ? (
          <p className="text-sm font-semibold text-alerta">Recibe el dinero que falta para poder cobrar.</p>
        ) : null}
        <div className="flex gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              disabled={pending}
              className={panelButtonClass("secundario", "lg", "min-h-14 flex-1 sm:flex-none")}
            >
              <IconChevronLeft className="size-5" />
              Atrás
            </button>
          ) : null}
          {step < 4 ? (
            <button
              type="button"
              onClick={goNext}
              aria-describedby={intentado && faltanAhora.length > 0 ? "taquilla-faltantes" : undefined}
              className={panelButtonClass("primario", "lg", "min-h-14 flex-[2] sm:ml-auto sm:flex-none sm:px-8")}
            >
              Continuar
              <IconChevronRight className="size-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={!puedeCobrar}
              aria-haspopup="dialog"
              className={panelButtonClass("primario", "lg", "min-h-14 flex-[2] sm:ml-auto sm:flex-none sm:px-8")}
            >
              <IconCash className="size-5" />
              {quote ? `Cobrar ${formatAmount(quote.amountInCurrency, quote.currency)}` : "Cobrar"}
            </button>
          )}
        </div>
      </div>

      {quote ? (
        <ChargeDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          submitting={pending}
          amountLabel={formatAmount(quote.amountInCurrency, quote.currency)}
          details={[
            ...(salidaElegida
              ? [
                  {
                    label: "Salida",
                    value: `${salidaElegida.origin} → ${salidaElegida.destination}, ${formatCaracasDateTime24(
                      new Date(salidaElegida.departsAtIso),
                    )}`,
                  },
                ]
              : []),
            { label: "Titular", value: nombreTitular || holderIdNumber },
            { label: "Personas", value: String(passengerCount) },
            ...(changeResult && changeResult.kind === "vuelto" && receivedAmount.trim() !== ""
              ? [
                  { label: "Recibido", value: formatAmount(receivedAmount.trim().replace(",", "."), quote.currency) },
                  { label: "Vuelto", value: formatAmount((changeResult.cents / 100).toString(), quote.currency) },
                ]
              : []),
          ]}
        />
      ) : null}
    </form>
  );
}
