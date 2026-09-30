import type { ReactNode } from "react";
import { IconChevronDown } from "@/components/icons";

/**
 * Sección plegable del tablero (spec 7.2: lo secundario va debajo y plegado).
 * Usa `<details>` nativo: funciona sin JavaScript, se abre con Enter o Espacio
 * y el lector de pantalla anuncia si está abierta. Empieza cerrada salvo que
 * se pida `defaultOpen`; React no vuelve a tocar el atributo `open` después,
 * así que lo que la persona abrió sigue abierto al refrescar los datos.
 */
export function Collapsible({
  title,
  description,
  defaultOpen,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-tarjeta border border-borde bg-superficie shadow-1"
    >
      <summary className="foco flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-tarjeta px-5 py-4 transition-colors duration-150 ease-out hover:bg-marca-50/60 motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          {/* HTML permite un encabezado dentro de `summary`: la sección sigue en el índice de títulos. */}
          <h2 className="text-lg font-semibold text-tinta">{title}</h2>
          {description ? (
            <span className="mt-0.5 block text-sm leading-snug text-tinta-suave">{description}</span>
          ) : null}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[15px] font-semibold text-marca-700">
          <span className="group-open:hidden">Ver</span>
          <span className="hidden group-open:inline">Ocultar</span>
          <IconChevronDown className="size-5 transition-transform duration-150 ease-out group-open:rotate-180 motion-reduce:transition-none" />
        </span>
      </summary>
      <div className="border-t border-borde p-5">{children}</div>
    </details>
  );
}
