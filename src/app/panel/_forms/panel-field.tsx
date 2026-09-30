import type { ReactNode } from "react";
import { FieldError, FieldHint } from "@/components/ui";
import { PANEL_LABEL_CLASS } from "@/components/panel-ui";

/**
 * Piezas comunes de los formularios reutilizables del panel: etiqueta visible,
 * ayuda debajo y error por campo unidos al control con `aria-describedby`. El
 * control lo pone cada formulario con `panelInputClass` y los atributos que
 * devuelve `panelFieldAria`.
 */

/** Ids de ayuda y error de un campo del panel. */
export function panelFieldIds(id: string, hint?: ReactNode, error?: string) {
  const hintId = hint ? `${id}-ayuda` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return { hintId, errorId, describedBy };
}

/** Atributos de accesibilidad del control: descripción y marca de error. */
export function panelFieldAria(id: string, hint?: ReactNode, error?: string) {
  const { describedBy } = panelFieldIds(id, hint, error);
  return {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? (true as const) : undefined,
  };
}

/**
 * Campo del panel: etiqueta, el control (hijo), la ayuda y el error. El aviso
 * general de arriba del formulario (`PanelFeedback`) ya anuncia el error con
 * `role="alert"`; aquí solo se marca el campo, para no leerlo dos veces.
 */
export function PanelField({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  const { hintId, errorId } = panelFieldIds(id, hint, error);
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label htmlFor={id} className={PANEL_LABEL_CLASS}>
        {label}
      </label>
      {children}
      {hintId ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
      {errorId ? (
        <FieldError id={errorId}>{error}</FieldError>
      ) : null}
    </div>
  );
}

/**
 * Dato fijo de un formulario de edición (placa, cédula): se muestra como
 * texto, no como un campo gris, y explica por qué no se puede cambiar.
 */
export function PanelFixedValue({ label, value, hint }: { label: string; value: ReactNode; hint: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-control border border-borde bg-lienzo px-4 py-3">
      <p className="text-sm font-semibold text-tinta-suave">{label}</p>
      <p className="tabular text-lg font-bold text-tinta">{value}</p>
      <p className="text-sm leading-snug text-tinta-suave">{hint}</p>
    </div>
  );
}

/**
 * Campo al que corresponde el error de un envío (`?campo=`), solo si es uno
 * de los campos de este formulario. Un valor manipulado o de otro formulario
 * se ignora y el error queda solo como aviso general.
 */
export function errorFieldFor(
  error: string | undefined,
  errorField: string | undefined,
  fields: readonly string[],
): string | undefined {
  if (!error || !errorField) return undefined;
  return fields.includes(errorField) ? errorField : undefined;
}
