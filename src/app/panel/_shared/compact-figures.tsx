import type { ReactNode } from "react";

export interface CompactFigure {
  label: string;
  value: ReactNode;
  /** Contexto corto de la cifra ("de 20"), opcional. */
  detail?: ReactNode;
}

/**
 * Tres cifras en una sola tarjeta de tres columnas, para el teléfono (por
 * debajo de `sm`): la cifra grande arriba y la etiqueta debajo. Reemplaza a
 * las tres `StatCard` apiladas, que ocupaban casi una pantalla entera antes
 * de la lista. Quien la usa muestra las `StatCard` con `hidden sm:grid`.
 */
export function CompactFigures({ figures }: { figures: readonly CompactFigure[] }) {
  return (
    <dl className="grid grid-cols-3 divide-x divide-borde rounded-tarjeta border border-borde bg-superficie shadow-1 sm:hidden">
      {figures.map((figura) => (
        <div key={figura.label} className="flex flex-col items-center gap-1 px-2 py-3 text-center">
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
