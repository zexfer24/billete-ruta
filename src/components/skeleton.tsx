import type { ReactNode } from "react";

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
