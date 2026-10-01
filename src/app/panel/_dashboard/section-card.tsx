import type { ReactNode } from "react";

/**
 * Clases de la cabecera de sección del tablero, compartidas por el bloque
 * real (`DashboardSection`) y su silueta de carga, para que no se separen.
 * La acción va siempre en el mismo sitio: debajo del texto en el teléfono y a
 * la derecha desde `sm`, sin depender del largo de la descripción (con
 * `SectionCard` una descripción larga bajaba el botón y una corta no, y las
 * tres secciones del tablero quedaban distintas).
 */
export const DASHBOARD_SECTION_HEADER_CLASS =
  "flex flex-wrap items-start justify-between gap-3 border-b border-borde px-5 py-4 sm:flex-nowrap";
export const DASHBOARD_SECTION_TEXT_CLASS = "min-w-0 basis-full sm:basis-auto sm:flex-1";
export const DASHBOARD_SECTION_ACTION_CLASS = "min-w-0 max-w-full sm:shrink-0";

/** Tarjeta de sección del tablero: título `h2`, descripción, acción y cuerpo. */
export function DashboardSection({
  id,
  title,
  description,
  action,
  children,
}: {
  /** Ancla de la sección, para enlazarla desde otra parte del tablero. */
  id?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 rounded-tarjeta border border-borde bg-superficie shadow-1">
      <div className={DASHBOARD_SECTION_HEADER_CLASS}>
        <div className={DASHBOARD_SECTION_TEXT_CLASS}>
          <h2 className="text-lg font-semibold text-tinta">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-snug text-tinta-suave">{description}</p> : null}
        </div>
        {action ? <div className={DASHBOARD_SECTION_ACTION_CLASS}>{action}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
