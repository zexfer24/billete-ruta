import { agencyColor, agencyInitials } from "@/lib/brand";

export interface AgencyBadgeProps {
  agencyId: string;
  name: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES: Record<NonNullable<AgencyBadgeProps["size"]>, string> = {
  sm: "h-8 min-w-12 text-sm",
  md: "h-11 min-w-16 text-lg",
  lg: "h-14 min-w-20 text-2xl",
};

/** Bloque de color con las iniciales de la agencia, al estilo "línea 25/38" de Transit. */
export function AgencyBadge({ agencyId, name, size = "md" }: AgencyBadgeProps) {
  const color = agencyColor(agencyId);

  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl px-2 font-extrabold text-white ${SIZE_CLASSES[size]}`}
      style={{ backgroundColor: color.bg }}
      title={name}
    >
      <span aria-hidden="true">{agencyInitials(name)}</span>
      <span className="sr-only">{name}</span>
    </span>
  );
}
