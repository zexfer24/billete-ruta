"use client";

import { useId, useState, type ReactNode } from "react";
import { IconChevronDown } from "@/components/icons";

/**
 * Sección plegable del tablero (spec 7.2: lo secundario va debajo y plegado).
 * Sigue el patrón de acordeón de WAI-ARIA: el `h2` envuelve un botón con
 * `aria-expanded`, así la sección aparece al navegar por encabezados y el
 * lector de pantalla anuncia si está abierta. (Un `h2` dentro de `<summary>`
 * se aplana en VoiceOver y en parte de NVDA, y el título se perdía.)
 *
 * El contenido se monta siempre y solo se oculta: sus consultas cargan igual,
 * y lo que la persona abrió sigue abierto cuando se refrescan los datos.
 */
export function Collapsible({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const titleId = `${id}-titulo`;
  const descriptionId = `${id}-descripcion`;
  const regionId = `${id}-contenido`;

  return (
    <section aria-labelledby={titleId} className="rounded-tarjeta border border-borde bg-superficie shadow-1">
      <h2 className="text-lg font-semibold text-tinta">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={regionId}
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          onClick={() => setOpen((abierto) => !abierto)}
          className="foco flex min-h-16 w-full cursor-pointer items-center justify-between gap-4 rounded-tarjeta px-5 py-4 text-left transition-colors duration-150 ease-out hover:bg-marca-50/60 motion-reduce:transition-none"
        >
          <span className="min-w-0">
            <span id={titleId} className="block">
              {title}
            </span>
            {description ? (
              <span id={descriptionId} className="mt-0.5 block text-sm font-normal leading-snug text-tinta-suave">
                {description}
              </span>
            ) : null}
          </span>
          <span
            aria-hidden="true"
            className="inline-flex shrink-0 items-center gap-1.5 text-[15px] font-semibold text-marca-700"
          >
            {open ? "Ocultar" : "Ver"}
            <IconChevronDown
              className={`size-5 transition-transform duration-150 ease-out motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
            />
          </span>
        </button>
      </h2>
      <div id={regionId} hidden={!open} className="border-t border-borde p-5">
        {children}
      </div>
    </section>
  );
}
