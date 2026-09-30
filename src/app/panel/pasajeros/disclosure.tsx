import type { ReactNode } from "react";
import { IconChevronDown } from "@/components/icons";

/**
 * Bloque plegable de los paneles laterales de "Pasajeros y pagos": guarda el
 * detalle que no hace falta para decidir (desglose, historial, datos de la
 * reserva) y deja a la vista lo esencial (spec 1.3). `<details>` nativo:
 * funciona con teclado y sin JavaScript.
 */
export function Disclosure({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group rounded-control border border-borde bg-superficie">
      <summary className="foco flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-control px-4 py-2.5 text-base font-semibold text-tinta transition-colors duration-150 ease-out hover:bg-marca-50/60 motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
        {title}
        <IconChevronDown className="size-5 shrink-0 text-marca-700 transition-transform duration-150 ease-out group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="border-t border-borde px-4 py-4">{children}</div>
    </details>
  );
}

/** Lista de pares etiqueta y valor, alineados en dos columnas. */
export function DetailList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-6 gap-y-2 text-[15px]">
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="font-medium text-tinta-suave">{item.label}</dt>
          <dd className="min-w-0 break-words text-tinta">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
