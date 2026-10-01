import type { ReactNode } from "react";
import Link from "next/link";
import { IconChevronDown, IconChevronLeft, IconChevronRight, IconLock } from "@/components/icons";
import { panelButtonClass } from "@/components/panel-ui";
import { dateTimePhrase, formatCount } from "./format";

/**
 * Piezas de lista compartidas por las pantallas del administrador: la lista
 * de tarjetas para móvil con "ver más", la paginación, la hora con su fecha
 * debajo y la nota de consulta registrada. Componentes de servidor.
 */

/**
 * Celdas de las tablas del terminal con 12 px de relleno lateral en vez de
 * 16: con la barra lateral, a 1024 px la tabla dispone de unos 686 px y así
 * todas caben sin desplazarse de lado.
 */
export const ADMIN_TH_CLASS = "px-3 py-3 text-left text-sm font-semibold text-tinta-suave";
export const ADMIN_TD_CLASS = "px-3 py-3 align-middle text-sm text-tinta";

/** Clases del `summary` de un `<details>`: un enlace de 44 px con flecha que gira al abrir. */
export const DISCLOSURE_SUMMARY_CLASS =
  "foco -ml-2 inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-control px-2 text-[15px] font-semibold text-marca-700 transition-colors duration-150 ease-out hover:bg-marca-50 motion-reduce:transition-none [&::-webkit-details-marker]:hidden";

/** Flecha del `summary`; necesita la clase `group` en el `<details>`. */
export function DisclosureChevron() {
  return (
    <IconChevronDown className="size-5 shrink-0 transition-transform duration-200 ease-out group-open:rotate-180 motion-reduce:transition-none" />
  );
}

/**
 * Lista de `MobileCard` para pantallas angostas. Muestra las primeras
 * `initial` y guarda el resto detrás de "Ver N más", para no obligar a
 * desplazarse por cien tarjetas. Si sobra una sola, se muestra: un botón
 * casi tan alto como la tarjeta que esconde solo agrega un toque.
 *
 * Solo para listas sin paginación del servidor (tablero, movimientos). Una
 * lista paginada muestra su página entera: plegarla esconde filas que
 * "Siguiente" se salta.
 */
export function MobileCardList({
  items,
  initial = 10,
  label,
  moreNoun,
}: {
  items: ReactNode[];
  initial?: number;
  label: string;
  /** Singular y plural de lo que se lista, para "Ver 1 viaje más" o "Ver 12 viajes más". */
  moreNoun: [string, string];
}) {
  const cut = items.length > initial + 1 ? initial : items.length;
  const visible = items.slice(0, cut);
  const rest = items.slice(cut);

  return (
    <div className="flex flex-col gap-3">
      <ul aria-label={label} className="flex flex-col gap-3">
        {visible}
      </ul>
      {rest.length > 0 ? (
        <details className="group">
          <summary className={DISCLOSURE_SUMMARY_CLASS}>
            Ver {formatCount(rest.length)} {rest.length === 1 ? moreNoun[0] : moreNoun[1]} más
            <DisclosureChevron />
          </summary>
          <ul aria-label={`${label}, continuación`} className="mt-3 flex flex-col gap-3">
            {rest}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

/**
 * Datos en una línea separados por " · " ("Salió 10:25 · Llegó 22:18"). El
 * punto va pegado al dato que lo sigue (espacio de no separación): si la línea
 * no cabe, se parte antes del punto, nunca con el punto colgando al final. Un
 * dato de texto va entero (`whitespace-nowrap`); uno largo se pasa como nodo,
 * con su parte indivisible marcada (`DatePhrase`), para que pueda partirse
 * antes de ella en una columna angosta.
 */
export function DotParts({ parts }: { parts: readonly ReactNode[] }) {
  return (
    <>
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 ? " ·\u00A0" : null}
          {typeof part === "string" ? <span className="whitespace-nowrap">{part}</span> : part}
        </span>
      ))}
    </>
  );
}

/**
 * "Enviado el 01/10/2026 a las 02:32": la entrada en texto normal y la fecha
 * con su hora (`dateTimePhrase`) en una sola pieza que nunca se parte.
 */
export function DatePhrase({ lead, date }: { lead: string; date: Date }) {
  return (
    <>
      {lead} <span className="whitespace-nowrap">{dateTimePhrase(date)}</span>
    </>
  );
}

/** Hora grande con la fecha debajo, para celdas de tabla. Sin fecha muestra una raya. */
export function TimeCell({ time, date }: { time?: string; date?: string }) {
  if (!time) return <span className="text-tinta-tenue">—</span>;
  return (
    <span className="flex flex-col">
      <span className="tabular font-semibold text-tinta">{time}</span>
      {date ? <span className="tabular text-sm text-tinta-suave">{date}</span> : null}
    </span>
  );
}

/** Nota breve que avisa que la consulta quedó registrada, porque muestra datos personales. */
export function AuditNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-sm leading-snug text-tinta-suave">
      <IconLock className="mt-px size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Paginación con "Anterior" y "Siguiente" de 44 px y la posición en palabras.
 * Sin más de una página no muestra nada.
 */
export function Pagination({
  page,
  totalPages,
  hrefFor,
  label = "Páginas",
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  /** Nombre de la navegación; cambia si hay dos en la misma pantalla (arriba y abajo de la lista). */
  label?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-3">
      <p className="tabular text-sm font-semibold text-tinta-suave">
        Página {formatCount(page)} de {formatCount(totalPages)}
      </p>
      <div className="flex flex-wrap gap-2">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className={panelButtonClass("secundario")}>
            <IconChevronLeft className="size-5 shrink-0" />
            Anterior
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link href={hrefFor(page + 1)} className={panelButtonClass("secundario")}>
            Siguiente
            <IconChevronRight className="size-5 shrink-0" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
