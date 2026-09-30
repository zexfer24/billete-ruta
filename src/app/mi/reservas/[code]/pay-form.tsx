"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/alert";
import { DetailsView, type JsonValue } from "@/components/details-view";
import { FileField } from "@/components/file-field";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, Field, Select } from "@/components/ui";
import { subirComprobanteAction, type SubirComprobanteState } from "../actions";

export interface MetodoVM {
  id: string;
  name: string;
  currency: "USD" | "VES" | "COP" | "USDT";
  /** Nombre de la moneda en palabras: "bolívares". */
  currencyName: string;
  details: JsonValue;
  /** Lo que falta pagar, ya convertido a la moneda del método: "Bs. 1.234,50". */
  balanceLabel: string;
  /** El mismo monto para escribirlo en el campo: "1234,50". */
  balanceInput: string;
}

const initialState: SubirComprobanteState = { error: null, success: false };

/**
 * Formulario de comprobante de una reserva. Envuelve `UploadForm` con una
 * `key` numérica: al pulsar "Enviar otro comprobante" se incrementa y todo el
 * subárbol (incluido el estado de `useActionState`) se remonta desde cero.
 * Con `collapsedLabel`, el formulario empieza oculto detrás de un botón (por
 * ejemplo, cuando ya hay un comprobante en revisión). `collapsedVariant`
 * baja ese botón a "fantasma" cuando no hace falta enviar nada más, para que
 * no parezca un paso pendiente.
 */
export default function PayForm({
  reservationId,
  paymentMethods,
  defaultMethodId,
  collapsedLabel,
  collapsedVariant = "secundario",
}: {
  reservationId: string;
  paymentMethods: MetodoVM[];
  defaultMethodId?: string;
  collapsedLabel?: string;
  collapsedVariant?: "secundario" | "fantasma";
}) {
  const [formKey, setFormKey] = useState(0);
  const [open, setOpen] = useState(!collapsedLabel);

  if (paymentMethods.length === 0) {
    return (
      <Alert tone="info" title="Por ahora no hay pagos en línea">
        Esta agencia no tiene métodos de pago en línea disponibles. Paga en su taquilla o
        vuelve a intentarlo más tarde.
      </Alert>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          collapsedVariant === "fantasma"
            ? buttonClass("fantasma", "-ml-3 self-start")
            : buttonClass("secundario", "w-full")
        }
      >
        {collapsedLabel}
      </button>
    );
  }

  return (
    <UploadForm
      key={formKey}
      reservationId={reservationId}
      paymentMethods={paymentMethods}
      defaultMethodId={defaultMethodId}
      onReset={() => setFormKey((k) => k + 1)}
    />
  );
}

function UploadForm({
  reservationId,
  paymentMethods,
  defaultMethodId,
  onReset,
}: {
  reservationId: string;
  paymentMethods: MetodoVM[];
  defaultMethodId?: string;
  onReset: () => void;
}) {
  const [state, formAction] = useActionState(subirComprobanteAction, initialState);
  const [selectedId, setSelectedId] = useState(
    paymentMethods.some((m) => m.id === defaultMethodId) ? defaultMethodId! : paymentMethods[0]!.id,
  );
  // Campos controlados: React reinicia el formulario tras cada envío y, si hubo un
  // error, la persona no tiene que volver a escribir el monto ni la referencia.
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const metodo = paymentMethods.find((m) => m.id === selectedId) ?? paymentMethods[0]!;

  // Tras enviar, el foco va al resultado: así se ve y se oye qué pasó.
  useEffect(() => {
    if (state.error) errorRef.current?.focus();
    if (state.success) successRef.current?.focus();
  }, [state]);

  if (state.success) {
    return (
      <div ref={successRef} tabIndex={-1} className="outline-none">
        <Alert
          tone="exito"
          title="Recibimos tu comprobante"
          action={
            <button type="button" onClick={onReset} className={buttonClass("fantasma", undefined, "sm")}>
              Enviar otro comprobante
            </button>
          }
        >
          La agencia lo revisará. Cuando lo confirme, te lo diremos en Avisos.
        </Alert>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="reservationId" value={reservationId} />
      <input type="hidden" name="currency" value={metodo.currency} />

      <Select
        label="¿Con qué vas a pagar?"
        name="paymentMethodId"
        value={selectedId}
        onChange={(event) => setSelectedId(event.target.value)}
      >
        {paymentMethods.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} (en {m.currencyName})
          </option>
        ))}
      </Select>

      <div className="flex flex-col gap-3 rounded-control border border-marca-200 bg-marca-50 p-4">
        <div>
          <p className="text-sm text-tinta-suave">Monto a pagar con {metodo.name}</p>
          <p className="tabular text-2xl font-bold text-tinta">{metodo.balanceLabel}</p>
        </div>
        <div className="border-t border-marca-200 pt-3">
          <p className="mb-2 font-semibold text-tinta">Datos para pagar</p>
          <DetailsView value={metodo.details} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Field
          label={`¿Cuánto pagaste? (en ${metodo.currencyName})`}
          name="amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder={metodo.balanceInput}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          hint={`Si pagaste todo, son ${metodo.balanceLabel}. También puedes pagar una parte.`}
          required
        />
        <button
          type="button"
          onClick={() => setAmount(metodo.balanceInput)}
          className={buttonClass("fantasma", "self-start -ml-2", "sm")}
        >
          Pagué todo lo que falta
        </button>
      </div>

      <Field
        label="Número de referencia"
        name="reference"
        type="text"
        autoComplete="off"
        minLength={4}
        value={reference}
        onChange={(event) => setReference(event.target.value)}
        hint="Es el número de la operación que te da tu banco o tu app al pagar. Mínimo 4 caracteres."
        required
      />

      <FileField
        name="image"
        label="Captura o foto del pago"
        buttonLabel="Elegir la captura o la foto"
        maxSizeMb={5}
        accept="image/jpeg,image/png,image/webp"
        hint="Que se vean el monto, la fecha y la referencia. JPG, PNG o WebP de hasta 5 MB."
        required
      />

      {state.error ? (
        <div ref={errorRef} tabIndex={-1} className="outline-none">
          <Alert tone="peligro" title="No se pudo enviar el comprobante">
            {state.error}
          </Alert>
        </div>
      ) : null}

      <SubmitButton pendingLabel="Enviando comprobante…" className={buttonClass("primario", "w-full", "lg")}>
        Enviar comprobante
      </SubmitButton>
    </form>
  );
}
