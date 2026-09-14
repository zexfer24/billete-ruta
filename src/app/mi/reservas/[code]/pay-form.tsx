"use client";

import { useActionState, useState } from "react";
import { Card, Field, buttonClass } from "@/components/ui";
import { DetailsView, type JsonValue } from "@/components/details-view";
import { IconCheck } from "@/components/icons";
import { subirComprobanteAction, type SubirComprobanteState } from "../actions";

export interface MetodoVM {
  id: string;
  name: string;
  currency: "USD" | "VES" | "COP" | "USDT";
  details: JsonValue;
}

const initialState: SubirComprobanteState = { error: null, success: false };

/** Estilo de caja compartido por el `<select>` de método y el `<input type="file">`. */
const BOX_CLASS =
  "min-h-11 rounded-xl border border-borde px-4 text-base focus:border-marca focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca motion-reduce:transition-none";

/**
 * Formulario de comprobante de una reserva. Envuelve `UploadForm` con una
 * `key` numérica: al pulsar "Enviar otro comprobante" se incrementa y todo el
 * subárbol (incluido el estado de `useActionState`) se remonta desde cero.
 */
export default function PayForm({
  reservationId,
  paymentMethods,
}: {
  reservationId: string;
  paymentMethods: MetodoVM[];
}) {
  const [formKey, setFormKey] = useState(0);

  if (paymentMethods.length === 0) {
    return (
      <p className="text-sm text-tinta-suave">
        No hay métodos de pago digitales disponibles en este momento. Contacta a la agencia.
      </p>
    );
  }

  return (
    <UploadForm
      key={formKey}
      reservationId={reservationId}
      paymentMethods={paymentMethods}
      onReset={() => setFormKey((k) => k + 1)}
    />
  );
}

function UploadForm({
  reservationId,
  paymentMethods,
  onReset,
}: {
  reservationId: string;
  paymentMethods: MetodoVM[];
  onReset: () => void;
}) {
  const [state, formAction, pending] = useActionState(subirComprobanteAction, initialState);
  const [selectedId, setSelectedId] = useState(paymentMethods[0]?.id ?? "");
  const metodo = paymentMethods.find((m) => m.id === selectedId) ?? null;

  if (state.success) {
    return (
      <Card className="flex flex-col items-start gap-3 border border-exito">
        <p className="flex items-center gap-2 font-semibold text-exito">
          <IconCheck aria-hidden="true" />
          Comprobante enviado. La agencia lo revisará y te avisaremos por WhatsApp.
        </p>
        <button type="button" onClick={onReset} className={buttonClass("fantasma")}>
          Enviar otro comprobante
        </button>
      </Card>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="reservationId" value={reservationId} />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-tinta">Método de pago</span>
        <select
          name="paymentMethodId"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className={BOX_CLASS}
        >
          {paymentMethods.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.currency})
            </option>
          ))}
        </select>
      </label>

      {metodo ? (
        <Card className="bg-marca-clara text-sm">
          <p className="font-semibold text-tinta">Datos de cobro</p>
          <DetailsView value={metodo.details} />
          <input type="hidden" name="currency" value={metodo.currency} />
        </Card>
      ) : null}

      <Field
        label="Monto pagado"
        name="amount"
        type="number"
        inputMode="decimal"
        min="0.01"
        step="0.01"
        required
      />

      <Field label="Referencia" name="reference" type="text" minLength={4} required />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-tinta">Imagen del comprobante</span>
        <input
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp"
          required
          className={BOX_CLASS}
        />
      </label>

      {state.error ? (
        <p role="alert" className="text-sm font-medium text-peligro">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={buttonClass("primario", "w-full")}>
        {pending ? "Enviando…" : "Enviar comprobante"}
      </button>
    </form>
  );
}
