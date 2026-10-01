import type { ReactNode } from "react";
import { cx } from "@/components/ui-classes";

export interface CompactFigure {
  label: string;
  value: ReactNode;
  /** Contexto corto de la cifra ("de 20"), opcional. */
  detail?: ReactNode;
  /**
   * Ocupa toda la fila, debajo de las demás. Para una cifra larga ("13 h 33
   * min") que no cabe en un tercio del teléfono sin partirse.
   */
  wide?: boolean;
}

/** Columnas de la rejilla según cuántas cifras van en la misma fila. */
const COLUMNAS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" };

/**
 * Dos o tres cifras en una sola tarjeta, para el teléfono (por debajo de
 * `sm`): la cifra grande arriba y la etiqueta debajo. Reemplaza a las
 * `StatCard` apiladas, que ocupaban casi una pantalla entera antes de la
 * lista. Quien la usa muestra las `StatCard` con `hidden sm:grid`.
 *
 * Las columnas salen de cuántas cifras comparten fila (las `wide` van solas
 * en la suya): con dos, una cifra de dinero ("$ 4.265,02") cabe sin partirse.
 * Las líneas entre celdas son el fondo `borde` asomando por el `gap-px`, así
 * valen igual entre columnas y entre filas.
 */
export function CompactFigures({ figures }: { figures: readonly CompactFigure[] }) {
  const enFila = Math.min(3, Math.max(1, figures.filter((f) => !f.wide).length));
  return (
    <dl
      className={cx(
        "grid gap-px overflow-hidden rounded-tarjeta border border-borde bg-borde shadow-1 sm:hidden",
        COLUMNAS[enFila],
      )}
    >
      {figures.map((figura) => (
        <div
          key={figura.label}
          className={cx("flex flex-col items-center gap-1 bg-superficie px-2 py-3 text-center", figura.wide && "col-span-full")}
        >
          <dt className="order-2 text-sm font-semibold leading-snug text-tinta-suave">{figura.label}</dt>
          <dd className="tabular order-1 text-2xl font-bold tracking-tight text-tinta">{figura.value}</dd>
          {figura.detail ? (
            <dd className="tabular order-3 text-sm leading-snug text-tinta-tenue">{figura.detail}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
