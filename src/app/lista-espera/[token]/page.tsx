import Link from "next/link";
import { getWaitlistClaim } from "@/modules/booking";
import { formatCaracasDateTime24 } from "@/lib/time";

export default async function ListaEsperaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const aviso = await getWaitlistClaim(token);

  if (!aviso) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Enlace vencido</h1>
        <p className="text-[var(--color-texto-suave)]">
          Este aviso de lista de espera ya no está vigente. Si todavía te interesa el puesto,
          vuelve a intentarlo desde la reserva.
        </p>
        <Link href="/mi/reservar" className="font-medium text-[var(--color-acento)]">
          Ir a reservar
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-texto-suave)]">
          Lista de espera
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">¡Hay un puesto para ti!</h1>
      </div>

      <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-6">
        <p className="font-medium">
          {aviso.departure.route.origin} → {aviso.departure.route.destination}
        </p>
        <p className="tabular mt-1 text-sm text-[var(--color-texto-suave)]">
          Salida: {formatCaracasDateTime24(aviso.departure.departsAt)}
        </p>
        <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
          Cantidad reservada en la lista: {aviso.passengerCount} pasajero(s)
        </p>
        {aviso.claimExpiresAt ? (
          <p className="mt-3 text-sm">
            Este aviso vence el {formatCaracasDateTime24(aviso.claimExpiresAt)}.
          </p>
        ) : null}
      </div>

      <Link
        href={`/mi/reservar?departureId=${aviso.departureId}&pasajeros=${aviso.passengerCount}`}
        className="rounded-lg bg-[var(--color-acento)] px-5 py-3 text-center font-medium text-white"
      >
        Completar mi reserva
      </Link>
    </main>
  );
}
