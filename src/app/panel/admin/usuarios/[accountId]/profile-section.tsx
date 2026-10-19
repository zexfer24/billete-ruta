import type { ReactNode } from "react";

/**
 * Clases de un enlace de texto del panel (nombre de un titular, "Volver"): morado
 * de marca, subrayado al pasar el cursor y foco visible.
 */
export const PROFILE_LINK_CLASS =
  "foco rounded-control font-semibold text-marca-700 underline-offset-2 hover:underline";

/**
 * Sección del perfil: `<section>` nombrada por su `h2`, con un dato a la
 * derecha del título (el total de filas, por ejemplo) y una frase de ayuda
 * opcional. El cuerpo lo pone cada sección (tarjeta, tabla o lista).
 */
export function ProfileSection({
  id,
  title,
  aside,
  description,
  children,
}: {
  /** Prefijo de los identificadores de la sección; el `h2` lleva `{id}-titulo`. */
  id: string;
  title: string;
  /** Dato corto a la derecha del título, por ejemplo "12 viajes". */
  aside?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  const titleId = `${id}-titulo`;
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id={titleId} className="text-lg font-semibold text-tinta">
            {title}
          </h2>
          {aside ? <p className="tabular text-sm font-semibold text-tinta-suave">{aside}</p> : null}
        </div>
        {description ? <p className="text-sm leading-snug text-tinta-suave">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Tarjeta blanca de una sección: borde, radio y sombra del panel. */
export function ProfileCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-tarjeta border border-borde bg-superficie p-5 shadow-1 ${className ?? ""}`}>
      {children}
    </div>
  );
}
