import type { InputHTMLAttributes, ReactNode } from "react";
import type { StatusTone } from "@/lib/labels";

/**
 * Piezas base compartidas por las pantallas del pasajero: botones, tarjetas,
 * campos de formulario, pastillas de estado y títulos de sección. Componente
 * de servidor: nada aquí usa hooks ni eventos propios.
 */

export type ButtonVariant = "primario" | "secundario" | "fantasma" | "ruta";

const BASE_BUTTON_CLASS =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-pastilla px-5 font-semibold transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca focus-visible:ring-offset-2 motion-reduce:transition-none";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primario: "bg-cta text-white hover:brightness-90",
  secundario: "bg-white text-marca border border-marca/20 hover:bg-marca-clara",
  fantasma: "bg-transparent text-marca hover:bg-marca-clara/60",
  ruta: "bg-ruta text-white hover:brightness-90",
};

/** Clases de un botón según su variante, listas para pegar en cualquier elemento clicable. */
export function buttonClass(variant: ButtonVariant, extra?: string): string {
  return [BASE_BUTTON_CLASS, VARIANT_CLASSES[variant], extra].filter(Boolean).join(" ");
}

interface CardProps {
  children: ReactNode;
  className?: string;
}

/** Contenedor blanco redondeado base de casi toda la app del pasajero. */
export function Card({ children, className }: CardProps) {
  return (
    <div className={["rounded-tarjeta bg-white p-5 shadow-sm", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "className"> {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  className?: string;
}

/** Campo de formulario con etiqueta visible, pista y error accesibles. */
export function Field({ label, name, hint, error, className, ...inputProps }: FieldProps) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-tinta">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-describedby={errorId ?? hintId}
        aria-invalid={error ? true : undefined}
        className={[
          "min-h-11 rounded-xl border px-4 text-base focus:border-marca focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca motion-reduce:transition-none",
          error ? "border-peligro" : "border-borde",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...inputProps}
      />
      {hint && !error ? (
        <p id={hintId} className="text-sm text-tinta-suave">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-peligro">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const PILL_TONE_CLASSES: Record<StatusTone, string> = {
  marca: "bg-marca-clara text-marca-oscura",
  exito: "bg-exito/15 text-exito",
  alerta: "bg-alerta/15 text-alerta",
  peligro: "bg-peligro/15 text-peligro",
  neutro: "bg-tinta/10 text-tinta-suave",
};

interface PillProps {
  tone: StatusTone;
  children: ReactNode;
}

/** Pastilla de estado con fondo suave y texto oscuro del mismo tono. */
export function Pill({ tone, children }: PillProps) {
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-pastilla px-3 py-1 text-sm font-semibold ${PILL_TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

interface SectionTitleProps {
  children: ReactNode;
  action?: ReactNode;
}

/** Título de sección en mayúsculas con una acción opcional a la derecha. */
export function SectionTitle({ children, action }: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta-suave">{children}</h2>
      {action ? <div className="text-sm font-semibold">{action}</div> : null}
    </div>
  );
}
