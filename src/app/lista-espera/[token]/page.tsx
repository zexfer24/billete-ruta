import Link from "next/link";
import { getWaitlistClaim } from "@/modules/booking";
import { formatCaracasDateTime24 } from "@/lib/time";
import { AppHeader } from "@/components/app-header";
import { buttonClass, Card } from "@/components/ui";
import { DepartureRow, type DepartureRowData } from "@/components/departure-row";

export default async function ListaEsperaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const aviso = await getWaitlistClaim(token);

  if (!aviso) {
    return (
      <div className="min-h-screen bg-lienzo">
        <AppHeader compact title="Lista de espera" subtitle="Enlace vencido" />
        <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
          <Card className="flex flex-col gap-3 text-center">
            <h1 className="text-xl font-bold text-tinta">Enlace vencido</h1>
            <p className="text-tinta-suave">
              Este aviso de lista de espera ya no está vigente. Si todavía te interesa el puesto,
              vuelve a intentarlo desde la reserva.
            </p>
            <Link href="/mi/reservar" className="font-semibold text-marca">
              Ir a reservar
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  // aviso.departure.route trae la ruta completa (getWaitlistClaim la incluye sin la agencia),
  // así que estimatedMinutes sí está disponible; agencyName no viene y se deja vacío.
  const now = new Date();
  const salida: DepartureRowData = {
    id: aviso.departureId,
    agencyId: aviso.departure.route.agencyId,
    agencyName: "",
    origin: aviso.departure.route.origin,
    destination: aviso.departure.route.destination,
    departsAt: aviso.departure.departsAt,
    estimatedMinutes: aviso.departure.route.estimatedMinutes,
    fareUsd: aviso.departure.route.fareUsd.toString(),
    available: aviso.passengerCount,
    capacity: aviso.passengerCount,
  };

  return (
    <div className="min-h-screen bg-lienzo">
      <AppHeader compact title="Lista de espera" subtitle="¡Hay un puesto para ti!" />
      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
        <DepartureRow departure={salida} now={now} />

        <Card className="flex flex-col gap-1">
          <p className="font-semibold text-tinta">Puestos: {aviso.passengerCount}</p>
          {aviso.claimExpiresAt ? (
            <p className="tabular text-sm text-tinta-suave">
              Reserva antes de: {formatCaracasDateTime24(aviso.claimExpiresAt)}
            </p>
          ) : null}
        </Card>

        <Link
          href={`/mi/reservar?departureId=${aviso.departureId}&pasajeros=${aviso.passengerCount}`}
          className={buttonClass("primario", "w-full")}
        >
          Reservar este puesto
        </Link>
      </main>
    </div>
  );
}
