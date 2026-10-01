import type { Metadata } from "next";
import Link from "next/link";
import { PublicCard } from "@/app/_publico/public-shell";
import { IconSearch } from "@/components/icons";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

/**
 * Página 404 de marca (spec 6.6): qué pasó, qué hacer y un solo botón. Copia
 * la estructura de `PublicShell` (logo morado sobre la tarjeta, misma columna
 * y misma altura del logo) pero sin el enlace de volver de arriba: aquí iría
 * al mismo destino que la acción principal y serían dos controles seguidos
 * para lo mismo. El icono en círculo es el mismo de las demás pantallas de
 * estado (enlace vencido, salida que ya no admite reservas), en el tono de
 * orientación de `EmptyState` (marca): una página inexistente no es un plazo
 * vencido ni algo pendiente, que es lo que significa el tono alerta.
 */
export default function NotFound() {
  return (
    <div className="min-h-dvh bg-lienzo">
      <div className="mx-auto flex w-full max-w-md flex-col px-4 pb-12 pt-[max(1rem,env(safe-area-inset-top))]">
        {/* mt-15 = alto del enlace de volver (44 px) + su separación (16 px):
            el logo queda a la misma altura que en ingresar o registro. */}
        <main id="contenido" className="mt-15 flex flex-col gap-6">
          <Logo tone="marca" priority className="mx-auto h-20 w-auto" />
          <PublicCard
            eyebrow={
              <span
                aria-hidden="true"
                className="grid size-14 place-items-center rounded-full bg-marca-50 text-marca-600 [&>svg]:size-7"
              >
                <IconSearch />
              </span>
            }
            title="No encontramos esta página"
            description="Puede que el enlace esté incompleto o que la página ya no exista. Desde el inicio puedes buscar tu viaje o entrar a tu cuenta."
          >
            <Link href="/" className={buttonClass("primario", "w-full", "lg")}>
              Ir al inicio
            </Link>
          </PublicCard>
        </main>
      </div>
    </div>
  );
}
