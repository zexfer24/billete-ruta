import { agencyColor, agencyInitials } from "@/lib/brand";

export interface AgencyBadgeProps {
  agencyId: string;
  name: string;
  size?: "sm" | "md" | "lg";
  /**
   * El nombre de la agencia ya se ve al lado: el bloque queda oculto para
   * lectores de pantalla, que si no dirían el nombre dos veces seguidas.
   */
  decorative?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<AgencyBadgeProps["size"]>, string> = {
  sm: "h-8 min-w-12 text-sm",
  md: "h-11 min-w-16 text-lg",
  lg: "h-14 min-w-20 text-2xl",
};

/**
 * Bloque de color con las iniciales de la agencia. El color sale de
 * `agencyColor` (spec 3.5: texto blanco con contraste de 5.4:1 o más) y el
 * nombre completo se lee en texto para lectores de pantalla (salvo con
 * `decorative`, cuando ya está escrito al lado). Sin nombre no se
 * pinta nada: un bloque de color sin iniciales no le dice nada a nadie.
 */
export function AgencyBadge({ agencyId, name, size = "md", decorative = false }: AgencyBadgeProps) {
  const iniciales = agencyInitials(name);
  if (!iniciales) return null;

  const color = agencyColor(agencyId);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-control px-2 font-extrabold tracking-tight ${SIZE_CLASSES[size]}`}
      style={{ backgroundColor: color.bg, color: color.fg }}
      title={decorative ? undefined : name}
      aria-hidden={decorative ? true : undefined}
    >
      <span aria-hidden="true">{iniciales}</span>
      {decorative ? null : <span className="sr-only">{name}</span>}
    </span>
  );
}
