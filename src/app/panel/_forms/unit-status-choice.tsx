import { FieldError } from "@/components/ui";
import { plural } from "../_shared/day-label";

/**
 * Elección del estado de un vehículo o chofer al editarlo, con las mismas
 * palabras que muestra la tabla de flota: "Disponible…" o "Fuera de
 * servicio". Son dos opciones grandes (radio) con una frase que explica qué
 * cambia. El valor enviado sigue siendo `true` o `false`.
 */
export function UnitStatusChoice({
  name,
  defaultActive,
  activeLabel,
  activeHint,
  inactiveHint,
  error,
}: {
  name: string;
  defaultActive: boolean;
  activeLabel: string;
  activeHint: string;
  inactiveHint: string;
  error?: string;
}) {
  const errorId = error ? `${name}-estado-error` : undefined;
  const opciones = [
    { value: "true", label: activeLabel, hint: activeHint, checked: defaultActive },
    { value: "false", label: "Fuera de servicio", hint: inactiveHint, checked: !defaultActive },
  ];

  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={errorId}>
      <legend className="mb-1.5 text-sm font-semibold text-tinta">Estado</legend>
      {opciones.map((opcion) => (
        <label
          key={opcion.value}
          className="flex min-h-14 cursor-pointer items-start gap-3 rounded-control border border-borde-control bg-superficie px-4 py-3 transition-colors duration-150 ease-out hover:border-marca-600 has-[:checked]:border-marca-600 has-[:checked]:bg-marca-50 motion-reduce:transition-none"
        >
          <input
            type="radio"
            name={name}
            value={opcion.value}
            defaultChecked={opcion.checked}
            required
            className="foco mt-0.5 size-5 shrink-0 accent-marca-600"
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold text-tinta">{opcion.label}</span>
            <span className="text-sm leading-snug text-tinta-suave">{opcion.hint}</span>
          </span>
        </label>
      ))}
      {errorId ? <FieldError id={errorId}>{error}</FieldError> : null}
    </fieldset>
  );
}

/**
 * Título del aviso de salidas asignadas al editar una unidad. La flota trae
 * como mucho las 3 próximas de los siguientes 7 días, así que 3 se lee como
 * "3 o más".
 */
export function upcomingTitle(count: number): string {
  const cuantas =
    count >= 3 ? `${count} o más salidas asignadas` : plural(count, "salida asignada", "salidas asignadas");
  return `Tiene ${cuantas} en los próximos 7 días`;
}
