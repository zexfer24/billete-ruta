import Link from "next/link";
import type { ReactNode } from "react";
import { IconClock } from "@/components/icons";
import { buttonClass } from "@/components/ui";
import { passengerHref } from "../../_publico/links";
import { PublicCard, PublicShell } from "../../_publico/public-shell";

/**
 * Enlace que ya no sirve: venció, ya se usó para reservar o nunca existió. El
 * sistema no distingue esos casos al leer el enlace, así que una sola frase
 * cubre los dos más comunes y dice qué hacer en cada uno, antes de los dos
 * botones.
 */
export function InactiveLink({ loggedIn }: { loggedIn: boolean }) {
  return (
    <PublicShell>
      <PublicCard
        eyebrow={<StateIcon tone="alerta" icon={<IconClock />} />}
        // "ya no está activo" va unido con espacios que no se cortan (U+00A0):
        // el título se parte en "Este enlace / ya no está activo", nunca
        // separando la negación.
        title={"Este enlace ya no está activo"}
        description="El tiempo para reservar este puesto terminó, o ya usaste el enlace. Si ya reservaste, lo encuentras en tus viajes; si no, busca otra salida."
      >
        <OtherDepartureActions loggedIn={loggedIn} showTrips />
      </PublicCard>
    </PublicShell>
  );
}

export function OtherDepartureActions({ loggedIn, showTrips = false }: { loggedIn: boolean; showTrips?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <Link href={passengerHref("/mi/reservar", loggedIn)} className={buttonClass("primario", "w-full", "lg")}>
        Buscar otra salida
      </Link>
      {showTrips ? (
        <Link href={passengerHref("/mi/reservas", loggedIn)} className={buttonClass("secundario", "w-full")}>
          Ver mis viajes
        </Link>
      ) : null}
    </div>
  );
}

const STATE_ICON_TONES = {
  /** Algo que requiere atención, como el enlace vencido. */
  alerta: "bg-alerta-suave text-alerta",
  /** Información neutra, como la salida que ya no admite reservas (como `EmptyState`). */
  marca: "bg-marca-50 text-marca-600",
} as const;

/** Icono grande en círculo que encabeza un estado (enlace vencido, salida no disponible). */
export function StateIcon({ icon, tone }: { icon: ReactNode; tone: keyof typeof STATE_ICON_TONES }) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-14 place-items-center rounded-full ${STATE_ICON_TONES[tone]} [&>svg]:size-7`}
    >
      {icon}
    </span>
  );
}
