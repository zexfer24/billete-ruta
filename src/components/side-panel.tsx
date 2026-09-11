import type { ReactNode } from "react";
import Link from "next/link";
import { CloseOnEscape } from "./close-on-escape";

/**
 * Panel lateral compartido, controlado por la URL: se abre cuando la página
 * recibe un parámetro de búsqueda y se cierra navegando a `closeHref`.
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
      <Link
        href={closeHref}
        scroll={false}
        aria-label="Cerrar panel"
        className="absolute inset-0 animate-[fondo-entrada_180ms_ease-out] bg-black/30 motion-reduce:animate-none"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-lateral-titulo"
        tabIndex={-1}
        id="panel-lateral"
        className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto animate-[panel-entrada_180ms_ease-out] border-l border-[var(--color-borde)] bg-[var(--color-superficie)] shadow-xl motion-reduce:animate-none"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--color-borde)] bg-[var(--color-superficie)] px-6 py-4">
          <div>
            <h2 id="panel-lateral-titulo" className="text-lg font-semibold tracking-tight">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-[var(--color-texto-suave)]">{subtitle}</p>
            ) : null}
          </div>
          <Link
            href={closeHref}
            scroll={false}
            className="shrink-0 rounded-md border border-[var(--color-borde)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-acento-suave)]"
          >
            Cerrar
          </Link>
        </div>
        <div className="px-6 py-5">{children}</div>
      </aside>
      <CloseOnEscape href={closeHref} />
    </div>
  );
}
