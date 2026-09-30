import type { Metadata } from "next";
import Link from "next/link";
import { Isotipo } from "@/components/logo";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = {
  title: "Viaje no encontrado",
};

/**
 * Reserva inexistente o de otra cuenta. No dice cuál de las dos es, para no
 * revelar si un código existe; ofrece volver a los viajes propios.
 */
export default function ReservaNoEncontrada() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-tarjeta border border-borde bg-superficie px-6 py-10 text-center shadow-1">
      <Isotipo tone="marca" decorative className="h-16 w-auto" />
      <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">No encontramos ese viaje</h1>
      <p className="max-w-sm leading-relaxed text-tinta-suave">
        Puede que el enlace esté incompleto o que la reserva sea de otra cuenta. En Mis viajes
        están todos los tuyos.
      </p>
      <Link href="/mi/reservas" className={buttonClass("primario", "w-full sm:w-auto")}>
        Ver mis viajes
      </Link>
    </div>
  );
}
