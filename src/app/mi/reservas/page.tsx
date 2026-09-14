import Link from "next/link";
import { requirePassenger } from "@/modules/auth";
import { balanceUsd } from "@/modules/catalog";
import { prisma } from "@/lib/prisma";
import { splitByDeparture } from "@/lib/reservations";
import { Card, buttonClass } from "@/components/ui";
import { TicketCard, type TicketCardData } from "@/components/ticket-card";

export default async function MisReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const pasajero = await requirePassenger();
  const { ver } = await searchParams;
  const vistaPasados = ver === "pasados";

  const reservas = await prisma.reservation.findMany({
    where: { accountId: pasajero.id },
    include: { departure: { include: { route: { include: { agency: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const { proximas, pasadas } = splitByDeparture(reservas, now);
  const listaActual = vistaPasados ? pasadas : proximas;

  const datos: TicketCardData[] = listaActual.map((reserva) => ({
    code: reserva.code,
    origin: reserva.departure.route.origin,
    destination: reserva.departure.route.destination,
    departsAt: reserva.departure.departsAt,
    agencyId: reserva.departure.route.agency.id,
    agencyName: reserva.departure.route.agency.name,
    status: reserva.status,
    totalUsd: reserva.totalUsd.toString(),
    paidUsd: reserva.paidUsd.toString(),
    balanceUsd: balanceUsd(reserva.totalUsd, reserva.paidUsd).toString(),
    passengerCount: reserva.passengerCount,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-tinta">Mis viajes</h1>

      <div className="flex gap-2" role="tablist" aria-label="Filtrar viajes por fecha">
        <Link
          href="/mi/reservas"
          role="tab"
          aria-current={!vistaPasados ? "page" : undefined}
          aria-selected={!vistaPasados}
          className={buttonClass(!vistaPasados ? "primario" : "secundario", "px-5")}
        >
          Próximos
        </Link>
        <Link
          href="/mi/reservas?ver=pasados"
          role="tab"
          aria-current={vistaPasados ? "page" : undefined}
          aria-selected={vistaPasados}
          className={buttonClass(vistaPasados ? "primario" : "secundario", "px-5")}
        >
          Pasados
        </Link>
      </div>

      {datos.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 text-center">
          <p className="text-tinta-suave">
            {vistaPasados
              ? "Todavía no tienes viajes pasados."
              : "Todavía no tienes viajes próximos."}
          </p>
          <Link href="/mi/reservar" className={buttonClass("primario")}>
            Reservar un puesto
          </Link>
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {datos.map((data) => (
            <li key={data.code}>
              <TicketCard data={data} size="compacta" href={`/mi/reservas/${data.code}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
