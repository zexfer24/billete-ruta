import Link from "next/link";
import { balanceUsd, listBookableDepartures } from "@/modules/catalog";
import { requirePassenger } from "@/modules/auth";
import { listNoticesForAccount } from "@/modules/notices";
import { prisma } from "@/lib/prisma";
import { buttonClass, Card, SectionTitle } from "@/components/ui";
import { NoticeCard } from "@/components/notice-card";
import { TicketCard, type TicketCardData } from "@/components/ticket-card";
import { DepartureBoard } from "@/components/departure-board";
import type { DepartureRowData } from "@/components/departure-row";

/** Estados de reserva que cuentan como "próximo viaje" en el inicio del pasajero. */
const ESTADOS_PROXIMO_VIAJE = [
  "PAGADA",
  "ABONADA",
  "EN_VALIDACION",
  "PAGO_EN_SITIO",
  "PENDIENTE_PAGO",
] as const;

const SEIS_HORAS_MS = 6 * 60 * 60 * 1000;

export default async function MiInicioPage() {
  const pasajero = await requirePassenger();
  const now = new Date();

  const [avisos, proximaReserva, salidas] = await Promise.all([
    listNoticesForAccount(pasajero.id),
    prisma.reservation.findFirst({
      where: {
        accountId: pasajero.id,
        status: { in: [...ESTADOS_PROXIMO_VIAJE] },
        departure: { departsAt: { gt: now } },
      },
      orderBy: { departure: { departsAt: "asc" } },
      include: { departure: { include: { route: { include: { agency: true } } } } },
    }),
    listBookableDepartures({ to: new Date(now.getTime() + SEIS_HORAS_MS), onlyWithSeats: true }, now),
  ]);

  const avisosVisibles = avisos.slice(0, 3);

  const ticketData: TicketCardData | null = proximaReserva
    ? {
        code: proximaReserva.code,
        origin: proximaReserva.departure.route.origin,
        destination: proximaReserva.departure.route.destination,
        departsAt: proximaReserva.departure.departsAt,
        agencyId: proximaReserva.departure.route.agencyId,
        agencyName: proximaReserva.departure.route.agency.name,
        status: proximaReserva.status,
        totalUsd: proximaReserva.totalUsd.toString(),
        paidUsd: proximaReserva.paidUsd.toString(),
        balanceUsd: balanceUsd(proximaReserva.totalUsd, proximaReserva.paidUsd).toString(),
        passengerCount: proximaReserva.passengerCount,
      }
    : null;

  const salidasVM: DepartureRowData[] = salidas.map((salida) => ({
    id: salida.id,
    agencyId: salida.agencyId,
    agencyName: salida.agencyName,
    origin: salida.origin,
    destination: salida.destination,
    departsAt: salida.departsAt,
    estimatedMinutes: salida.estimatedMinutes,
    fareUsd: salida.fareUsd.toString(),
    available: salida.available,
    capacity: salida.capacity,
  }));

  return (
    <div className="flex flex-col gap-6">
      {avisosVisibles.length > 0 ? (
        <div className="flex flex-col gap-3">
          {avisosVisibles.map((aviso) => (
            <NoticeCard key={`${aviso.kind}-${aviso.reservationCode ?? "cuenta"}`} notice={aviso} />
          ))}
          {avisos.length > avisosVisibles.length ? (
            <Link href="/mi/avisos" className="text-center text-sm font-semibold text-marca">
              Ver todos los avisos
            </Link>
          ) : null}
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        <SectionTitle>Tu próximo viaje</SectionTitle>
        {ticketData ? (
          <TicketCard data={ticketData} size="compacta" href={`/mi/reservas/${ticketData.code}`} />
        ) : (
          <Card className="flex flex-col items-start gap-3">
            <p className="text-tinta">Todavía no tienes viajes próximos.</p>
            <Link href="/mi/reservar" className={buttonClass("primario")}>
              Reservar un puesto
            </Link>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle
          action={
            <Link href="/mi/reservar" className="text-marca">
              Ver todas
            </Link>
          }
        >
          Próximas salidas
        </SectionTitle>
        <DepartureBoard
          departures={salidasVM}
          now={now}
          limit={5}
          hrefFor={(id) => `/mi/reservar?departureId=${id}`}
        />
      </section>
    </div>
  );
}
