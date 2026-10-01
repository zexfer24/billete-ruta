import type { ReactNode } from "react";

/**
 * Reparto del buscador de Usuarios y de Mensajes, el mismo en la página y en
 * su silueta. La ayuda (los ejemplos) va siempre justo debajo del campo, como
 * pide la spec 6.2: en el teléfono el orden es campo, ejemplos y botones; desde
 * `sm`, los botones quedan a la derecha del campo y los ejemplos debajo de él.
 * El orden del documento es el del teléfono, así el teclado pasa del campo a
 * los botones sin saltos.
 */
export function SearchLayout({
  field,
  hint,
  actions,
}: {
  /** El campo de búsqueda (o su silueta), a todo el ancho de su columna. */
  field: ReactNode;
  /** Los ejemplos bajo el campo. */
  hint: ReactNode;
  /** Buscar y, si hay búsqueda, Limpiar búsqueda. */
  actions: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-2">
      <div className="flex min-w-0 sm:col-start-1 sm:row-start-1">{field}</div>
      <div className="sm:col-start-1 sm:row-start-2">{hint}</div>
      <div className="mt-1.5 flex flex-wrap items-start gap-2 sm:col-start-2 sm:row-start-1 sm:mt-0">{actions}</div>
    </div>
  );
}
