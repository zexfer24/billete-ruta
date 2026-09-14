/**
 * Muestra un valor JSON arbitrario (los "detalles" de un método de pago,
 * como cuenta y banco) como lista de pares clave-valor, o como texto simple
 * si no es un objeto. Componente de servidor, sin hooks. Lo comparten el
 * asistente de reserva (`step-payment.tsx`) y el formulario de comprobante
 * de una reserva ya creada (`pay-form.tsx`).
 */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export function DetailsView({ value }: { value: JsonValue }) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return (
      <dl className="mt-1 grid grid-cols-1 gap-1">
        {Object.entries(value).map(([key, val]) => (
          <div key={key} className="flex justify-between gap-2">
            <dt className="text-tinta-suave">{key}</dt>
            <dd className="font-medium text-tinta">{String(val)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return <p className="text-tinta">{String(value)}</p>;
}
