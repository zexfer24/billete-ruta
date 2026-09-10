"use client";

import { useActionState, useState } from "react";
import { subirComprobanteAction, type SubirComprobanteState } from "../actions";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export interface MetodoVM {
  id: string;
  name: string;
  currency: "USD" | "VES" | "COP" | "USDT";
  details: JsonValue;
}

const initialState: SubirComprobanteState = { error: null };

export default function PayForm({
  reservationId,
  paymentMethods,
}: {
  reservationId: string;
  paymentMethods: MetodoVM[];
}) {
  const [state, formAction, pending] = useActionState(subirComprobanteAction, initialState);
  const [selectedId, setSelectedId] = useState(paymentMethods[0]?.id ?? "");
  const metodo = paymentMethods.find((m) => m.id === selectedId) ?? null;

  if (paymentMethods.length === 0) {
    return (
      <p className="text-sm text-[var(--color-texto-suave)]">
        No hay métodos de pago digitales disponibles en este momento. Contacta a la agencia.
      </p>
    );
  }

  return (
    <form action={formAction} encType="multipart/form-data" className="flex flex-col gap-4">
      <input type="hidden" name="reservationId" value={reservationId} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Método de pago</span>
        <select
          name="paymentMethodId"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-lg border border-[var(--color-borde)] px-3 py-2"
        >
          {paymentMethods.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.currency})
            </option>
          ))}
        </select>
      </label>

      {metodo ? (
        <div className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-acento-suave)] p-3 text-sm">
          <p className="font-medium">Datos de cobro</p>
          <DetailsView value={metodo.details} />
          <input type="hidden" name="currency" value={metodo.currency} />
        </div>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Monto pagado</span>
        <input
          type="number"
          name="amount"
          min="0.01"
          step="0.01"
          required
          className="rounded-lg border border-[var(--color-borde)] px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Referencia</span>
        <input
          type="text"
          name="reference"
          minLength={4}
          required
          className="rounded-lg border border-[var(--color-borde)] px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Imagen del comprobante</span>
        <input
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp"
          required
          className="rounded-lg border border-[var(--color-borde)] px-3 py-2"
        />
      </label>

      {state.error ? <p className="text-sm text-[var(--color-peligro)]">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--color-acento)] px-5 py-3 font-medium text-white disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar comprobante"}
      </button>
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
