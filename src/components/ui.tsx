import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { IconAlertCircle, IconChevronDown, IconInfo } from "./icons";
import {
  cx,
  fieldControlClass,
  pillClass,
  progressPercent,
  PROGRESS_TONE_CLASSES,
  type PillTone,
  type ProgressTone,
} from "./ui-classes";

/**
 * Piezas base del sistema de diseño (spec 2026-09-30, sección 6): botones,
 * tarjetas, campos, pastillas de estado, títulos de sección, estado vacío y
 * barra de progreso. Las usan la app del pasajero y, a través de
 * `panel-ui.tsx`, el panel. Sin estado ni efectos: sirven en componentes de
 * servidor y de cliente por igual. Las clases puras viven en `ui-classes.ts`.
 */

export { buttonClass, type ButtonSize, type ButtonVariant, type PillTone } from "./ui-classes";
export { FileField, type FileFieldProps } from "./file-field";

interface CardProps {
  children: ReactNode;
  className?: string;
}

/** Contenedor blanco base de casi toda la interfaz: borde suave, sombra leve y radio de tarjeta. */
export function Card({ children, className }: CardProps) {
  return (
    <div className={cx("rounded-tarjeta border border-borde bg-superficie p-5 shadow-1", className)}>
      {children}
    </div>
  );
}

/** Texto de ayuda debajo de un campo. El `id` se enlaza desde el control con `aria-describedby`. */
export function FieldHint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-sm leading-snug text-tinta-suave">
      {children}
    </p>
  );
}

/**
 * Error de un campo, con icono y en rojo. `afterSubmit` le da `role="alert"`
 * para anunciarlo de inmediato: úsalo solo cuando el error llega tras enviar
 * el formulario, nunca mientras la persona escribe.
 */
export function FieldError({
  id,
  children,
  afterSubmit = false,
}: {
  id: string;
  children: ReactNode;
  afterSubmit?: boolean;
}) {
  return (
    <p
      id={id}
      role={afterSubmit ? "alert" : undefined}
      className="flex items-start gap-1.5 text-sm font-semibold leading-snug text-peligro"
    >
      <IconAlertCircle className="mt-px size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Ids de ayuda y error de un campo, y el valor de `aria-describedby` que los une. */
function describedBy(fieldId: string, hint?: ReactNode, error?: ReactNode) {
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const ids = [hintId, errorId].filter(Boolean).join(" ");
  return { hintId, errorId, describedBy: ids || undefined };
}

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "className"> {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  /** El error viene del envío del formulario: se anuncia con `role="alert"`. */
  errorAfterSubmit?: boolean;
  /** Id del control; por defecto es `name`. Úsalo si dos campos comparten nombre. */
  id?: string;
  className?: string;
}

/**
 * Campo de texto del pasajero: etiqueta visible, control de 48 px con texto
 * de 16 px (evita el zoom de iOS), ayuda y error debajo, unidos al control
 * con `aria-describedby`. El error se anuncia con cortesía mientras se
 * escribe y con `role="alert"` solo si llega tras enviar.
 */
export function Field({ label, name, hint, error, errorAfterSubmit, id, className, ...inputProps }: FieldProps) {
  const fieldId = id ?? name;
  const ids = describedBy(fieldId, hint, error);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-semibold text-tinta">
        {label}
      </label>
      <input
        id={fieldId}
        name={name}
        aria-describedby={ids.describedBy}
        aria-invalid={error ? true : undefined}
        className={fieldControlClass(Boolean(error), className)}
        {...inputProps}
      />
      {ids.hintId ? <FieldHint id={ids.hintId}>{hint}</FieldHint> : null}
      <div aria-live="polite">
        {ids.errorId ? (
          <FieldError id={ids.errorId} afterSubmit={errorAfterSubmit}>
            {error}
          </FieldError>
        ) : null}
      </div>
    </div>
  );
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "name" | "className"> {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  errorAfterSubmit?: boolean;
  id?: string;
  className?: string;
  /** Primera opción vacía y no elegible, por ejemplo "Elige un método de pago". */
  placeholder?: string;
  children: ReactNode;
}

/** Lista desplegable con la misma apariencia, ayuda y error que `Field`. */
export function Select({
  label,
  name,
  hint,
  error,
  errorAfterSubmit,
  id,
  className,
  placeholder,
  children,
  ...selectProps
}: SelectProps) {
  const fieldId = id ?? name;
  const ids = describedBy(fieldId, hint, error);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-semibold text-tinta">
        {label}
      </label>
      <div className="relative">
        <select
          id={fieldId}
          name={name}
          aria-describedby={ids.describedBy}
          aria-invalid={error ? true : undefined}
          className={fieldControlClass(Boolean(error), cx("cursor-pointer appearance-none pr-11", className))}
          {...selectProps}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {children}
        </select>
        <IconChevronDown className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-tinta-suave" />
      </div>
      {ids.hintId ? <FieldHint id={ids.hintId}>{hint}</FieldHint> : null}
      <div aria-live="polite">
        {ids.errorId ? (
          <FieldError id={ids.errorId} afterSubmit={errorAfterSubmit}>
            {error}
          </FieldError>
        ) : null}
      </div>
    </div>
  );
}

interface PillProps {
  tone: PillTone;
  children: ReactNode;
  /** Icono en lugar del punto de color; se oculta a lectores de pantalla porque el texto ya lo dice. */
  icon?: ReactNode;
}

/**
 * Pastilla de estado: punto (o icono) y texto del tono sobre su fondo suave.
 * El texto siempre está, el color nunca es la única señal. Se parte en dos
 * líneas antes que desbordarse. `StatusBadge` del panel la reutiliza.
 */
export function Pill({ tone, children, icon }: PillProps) {
  return (
    <span className={pillClass(tone)}>
      {icon ? (
        <span aria-hidden="true" className="shrink-0 [&>svg]:size-4">
          {icon}
        </span>
      ) : (
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-current" />
      )}
      <span>{children}</span>
    </span>
  );
}

interface SectionTitleProps {
  children: ReactNode;
  action?: ReactNode;
  id?: string;
}

/** Título de sección (`h2`) en oración normal, con una acción opcional a la derecha. */
export function SectionTitle({ children, action, id }: SectionTitleProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <h2 id={id} className="text-lg font-semibold text-tinta">
        {children}
      </h2>
      {action ? <div className="text-sm font-semibold">{action}</div> : null}
    </div>
  );
}

/**
 * Estado vacío útil: icono en círculo, qué significa y una acción para salir
 * de ahí. Si no se pasa icono se usa el de información.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center gap-3 rounded-tarjeta border border-dashed border-borde bg-superficie px-6 py-10 text-center",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-full bg-marca-50 text-marca-600 [&>svg]:size-7"
      >
        {icon ?? <IconInfo />}
      </span>
      <div className="flex max-w-md flex-col gap-1">
        <p className="text-base font-semibold text-tinta">{title}</p>
        {description ? <p className="text-sm leading-relaxed text-tinta-suave">{description}</p> : null}
      </div>
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

/**
 * Barra de progreso de 8 px con su etiqueta visible ("12 de 40 puestos",
 * "Pagaste $ 20,00 de $ 40,00"). El porcentaje también se expone a lectores
 * de pantalla con `role="progressbar"`.
 */
export function ProgressBar({
  value,
  max,
  label,
  tone = "marca",
  detail,
  className,
}: {
  value: number;
  max: number;
  label: string;
  tone?: ProgressTone;
  /** Texto secundario a la derecha de la etiqueta, por ejemplo el porcentaje o lo que falta. */
  detail?: ReactNode;
  className?: string;
}) {
  const percent = progressPercent(value, max);

  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        {/* La etiqueta se lee una sola vez, como nombre de la barra. */}
        <span aria-hidden="true" className="tabular font-medium text-tinta">
          {label}
        </span>
        {detail ? <span className="tabular text-tinta-suave">{detail}</span> : null}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, max)}
        aria-valuenow={Math.min(Math.max(0, value), Math.max(0, max))}
        className="h-2 w-full overflow-hidden rounded-pastilla bg-borde"
      >
        <div className={cx("h-full rounded-pastilla", PROGRESS_TONE_CLASSES[tone])} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
