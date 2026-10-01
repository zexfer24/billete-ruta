import type { ReactNode } from "react";
import {
  BUTTON_SIZE_CLASSES,
  PANEL_BUTTON_SIZE_CLASSES,
  cx,
  type ButtonSize,
  type PanelButtonSize,
} from "@/components/ui-classes";

/**
 * Piezas de carga (spec 6.5). Componentes de servidor. Cada `loading.tsx`
 * compone con ellas la silueta real de su pantalla: mismas alturas, radios y
 * número aproximado de filas. El brillo lo da la clase `.esqueleto` de
 * globals.css y queda estático con movimiento reducido.
 */

interface SkeletonProps {
  /** Tamaño y forma del bloque: `h-12 w-full`, `h-40 rounded-tarjeta`… */
  className?: string;
}

/** Bloque de carga. Por defecto tiene el radio de un control (12 px). */
export function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden="true" className={`esqueleto ${className ?? ""}`} />;
}

/** Anchos decrecientes: las líneas de un párrafo real no miden todas lo mismo. */
const LINE_WIDTHS = ["w-full", "w-11/12", "w-4/5", "w-2/3", "w-3/4", "w-1/2"] as const;

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

/** Varias líneas de texto de 16 px, la última más corta. */
export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  const count = Math.max(1, Math.floor(lines));
  return (
    <div aria-hidden="true" className={`flex flex-col gap-2 ${className ?? ""}`}>
      {Array.from({ length: count }, (_, index) => {
        const width =
          count === 1
            ? "w-2/3"
            : index === count - 1
              ? "w-1/2"
              : LINE_WIDTHS[index % (LINE_WIDTHS.length - 1)];
        return <div key={index} className={`esqueleto h-4 rounded-pastilla ${width}`} />;
      })}
    </div>
  );
}

/** Círculo de carga, para avatares, iconos en círculo o bloques de agencia. */
export function SkeletonCircle({ className }: SkeletonProps) {
  return (
    <div aria-hidden="true" className={`esqueleto shrink-0 rounded-full ${className ?? "size-10"}`} />
  );
}

/*
 * Controles quietos. Un `loading.tsx` no debe pintar botones ni campos que se
 * vean vivos: una persona que nunca usó un sistema los toca y no pasa nada.
 * La convención es la de `_publico/form-skeleton.tsx` y del kit del admin
 * (`admin/_shared/skeletons.tsx`): el control lleva el brillo de `.esqueleto`
 * en vez de su borde o su relleno, con sus mismas medidas y radio, y el texto
 * de un botón va real para leer qué hará. Son `span` con `aria-hidden`: no
 * reciben foco, no cambian el cursor y no se seleccionan.
 */

type SkeletonButtonProps = {
  children: ReactNode;
  className?: string;
  /**
   * Botón sin relleno ni borde en la página real (`fantasma` o enlace de
   * texto, como «Actualizar»): conserva su texto sin fondo, en tinta-suave en
   * vez de morado, para que no cambie de forma al llegar la página.
   */
  ghost?: boolean;
  /** Sobre la banda morada (el buscador de la portada): fondo y texto claros. */
  onMarca?: boolean;
} & (
  | {
      /** Botón del panel (`panelButtonClass`), radio de control. */
      shape?: "control";
      size?: PanelButtonSize;
    }
  | {
      /** Botón del pasajero (`buttonClass`), forma de pastilla. */
      shape: "pastilla";
      size?: ButtonSize;
    }
);

/** Botón quieto: mismas medidas que el real del mismo `shape` y `size`. */
export function SkeletonButton({ children, className, ghost = false, onMarca = false, ...rest }: SkeletonButtonProps) {
  const sizeClass =
    rest.shape === "pastilla"
      ? cx("rounded-pastilla", BUTTON_SIZE_CLASSES[rest.size ?? "md"])
      : cx("rounded-control", PANEL_BUTTON_SIZE_CLASSES[rest.size ?? "md"]);
  const surface = ghost
    ? onMarca
      ? "text-white/80"
      : "text-tinta-suave"
    : onMarca
      ? "esqueleto bg-white/15 text-white"
      : "esqueleto text-marca-700";
  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-flex cursor-default select-none items-center justify-center gap-2 text-center font-semibold leading-tight",
        sizeClass,
        surface,
        className,
      )}
    >
      {children}
    </span>
  );
}

interface SkeletonScreenProps {
  /** Texto que oyen los lectores de pantalla mientras carga. */
  label?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Contenedor de la silueta de una pantalla. Anuncia la carga a los lectores
 * de pantalla con `label` (oculto a la vista); los bloques de dentro son
 * decorativos. Los textos fijos conocidos (títulos, logo) pueden ir reales.
 * No lleva `aria-busy`: en una región viva, los lectores de pantalla retienen
 * los anuncios mientras está ocupada, y como el nodo se desmonta sin volver a
 * `false`, nunca dirían "Cargando…".
 */
export function SkeletonScreen({ label = "Cargando…", children, className }: SkeletonScreenProps) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
