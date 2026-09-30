import type { Metadata } from "next";
import Link from "next/link";
import { PublicCard, PublicShell } from "@/app/_publico/public-shell";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

/**
 * Página 404 de marca (spec 6.6): qué pasó, qué hacer y un solo botón. Usa la
 * misma estructura que las demás pantallas públicas de un solo propósito
 * (volver arriba, logo morado sobre la tarjeta y acción principal grande).
 */
export default function NotFound() {
  return (
    <PublicShell>
      <PublicCard
        title="No encontramos esta página"
        description="Puede que el enlace esté incompleto o que la página ya no exista. Desde el inicio puedes buscar tu viaje o entrar a tu cuenta."
      >
        <Link href="/" className={buttonClass("primario", "w-full", "lg")}>
          Ir al inicio
        </Link>
      </PublicCard>
    </PublicShell>
  );
}
