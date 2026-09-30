import type { ReactNode } from "react";
import Link from "next/link";
import { CloseOnEscape } from "./close-on-escape";
import { IconClose } from "./icons";

/**
 * Panel lateral compartido, controlado por la URL: se abre cuando la página
 * recibe un parámetro de búsqueda y se cierra navegando a `closeHref`. Tiene
 * un título claro, un botón "Cerrar" de 44 px con foco visible y se cierra
 * también con Escape o tocando el fondo. El foco queda dentro del panel
 * mientras está abierto (`CloseOnEscape`).
 */
export function SidePanel({
  title,
  subtitle,
  closeHref,
  children,
}: {
  title: string;
  subtitle?: string;
  closeHref: string;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Fondo: cierra con el ratón o el dedo; el teclado usa "Cerrar" o Escape. */}
      <Link
        href={closeHref}
        scroll={false}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0 animate-[fondo-entrada_180ms_ease-out] bg-tinta/40 motion-reduce:animate-none"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-lateral-titulo"
        tabIndex={-1}
        id="panel-lateral"
        className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto animate-[panel-entrada_180ms_ease-out] border-l border-borde bg-superficie text-tinta shadow-2 outline-none motion-reduce:animate-none"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-borde bg-superficie px-5 py-4 sm:px-6">
          <div className="min-w-0 pt-1.5">
            <h2 id="panel-lateral-titulo" className="text-xl font-bold leading-snug tracking-tight">
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-sm leading-snug text-tinta-suave">{subtitle}</p> : null}
          </div>
          <Link
            href={closeHref}
            scroll={false}
            className="foco inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-control border border-borde-control bg-superficie px-3.5 text-[15px] font-semibold text-tinta transition-colors duration-150 ease-out hover:border-marca-600 hover:bg-marca-50 hover:text-marca-800 motion-reduce:transition-none"
          >
            <IconClose className="size-5 shrink-0" />
            Cerrar
          </Link>
        </div>
        <div className="px-5 py-5 sm:px-6">{children}</div>
      </aside>
      <CloseOnEscape href={closeHref} />
    </div>
  );
}
