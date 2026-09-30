import type { Metadata } from "next";
import Link from "next/link";
import { balanceUsd, listBookableDepartures } from "@/modules/catalog";
import { requirePassenger } from "@/modules/auth";
import { listNoticesForAccount } from "@/modules/notices";
import { prisma } from "@/lib/prisma";
import { formatUsdString } from "@/lib/decimal";
import { buttonClass, Card, SectionTitle } from "@/components/ui";
import { NoticeCard } from "@/components/notice-card";
import { TicketCard, type TicketCardData } from "@/components/ticket-card";
import { DepartureBoard } from "@/components/departure-board";
import type { DepartureRowData } from "@/components/departure-row";
import { Isotipo } from "@/components/logo";
import { IconCamera, IconChevronRight } from "@/components/icons";
import { reservationActionLabel } from "@/components/passenger-copy";

export const metadata: Metadata = {
  title: "Inicio",
};

/** Estados de reserva que cuentan como "próximo viaje" en el inicio del pasajero. */
const ESTADOS_PROXIMO_VIAJE = [
  "PAGADA",
  "ABONADA",
  "EN_VALIDACION",
  "PAGO_EN_SITIO",
  "PENDIENTE_PAGO",
] as const;

const SEIS_HORAS_MS = 6 * 60 * 60 * 1000;

/** Enlace de texto con área táctil de 44 px, para "Ver todos". */
const ENLACE_SECCION =
  "foco inline-flex min-h-11 items-center gap-1 rounded-control px-1 font-semibold text-marca-700 hover:underline";

/**
 * Inicio del pasajero (spec 7.1): arriba la acción que toca ahora, en grande
 * (pagar, ver el ticket, subir la cédula o reservar); debajo, como mucho un
 * aviso con el enlace al resto, y las salidas de las próximas horas.
 */
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

  const faltaCedula = avisos.some((aviso) => aviso.kind === "DOCUMENTO_FALTANTE");

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

  // Si la acción principal ya es subir la cédula, su aviso no se repite debajo.
  const heroEsCedula = !ticketData && faltaCedula;
  const avisosRestantes = heroEsCedula
    ? avisos.filter((aviso) => aviso.kind !== "DOCUMENTO_FALTANTE")
    : avisos;
  const avisoDestacado = avisosRestantes[0] ?? null;

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
    <div className="flex flex-col gap-8">
      <section aria-labelledby="accion-principal" className="flex flex-col gap-4">
        {ticketData ? (
          <>
            <h1 id="accion-principal" className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">
              Tu próximo viaje
            </h1>
            <TicketCard data={ticketData} size="compacta" />
            <Link
              href={`/mi/reservas/${ticketData.code}`}
              className={buttonClass("primario", "w-full", "lg")}
            >
              {reservationActionLabel(ticketData.status, formatUsdString(ticketData.balanceUsd))}
            </Link>
          </>
        ) : heroEsCedula ? (
          <>
            <h1 id="accion-principal" className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">
              Antes de tu primer viaje
            </h1>
            <Card className="flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="grid size-12 shrink-0 place-items-center rounded-full bg-alerta-suave text-alerta"
                >
                  <IconCamera />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="text-lg font-semibold text-tinta">Sube la foto de tu cédula</p>
                  <p className="leading-relaxed text-tinta-suave">
                    La necesitamos para confirmar cualquier reserva. Solo toma un minuto.
                  </p>
                </div>
              </div>
              <Link href="/mi/documentos" className={buttonClass("primario", "w-full", "lg")}>
                Subir la foto de mi cédula
              </Link>
              <Link href="/mi/reservar" className={buttonClass("fantasma", "w-full")}>
                Ver las salidas
              </Link>
            </Card>
          </>
        ) : (
          <>
            <h1 id="accion-principal" className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">
              Reserva tu próximo viaje
            </h1>
            <Card className="flex flex-col items-center gap-4 text-center">
              <Isotipo tone="marca" decorative className="h-16 w-auto" />
              <p className="max-w-sm leading-relaxed text-tinta-suave">
                Elige la salida, di quiénes viajan y paga en línea o en la taquilla. Tu ticket
                llega aquí mismo.
              </p>
              <Link href="/mi/reservar" className={buttonClass("primario", "w-full", "lg")}>
                Reservar un viaje
              </Link>
            </Card>
          </>
        )}
      </section>

      {avisoDestacado ? (
        <section aria-labelledby="avisos-inicio" className="flex flex-col gap-3">
          <SectionTitle
            id="avisos-inicio"
            action={
              avisosRestantes.length > 1 ? (
                <Link href="/mi/avisos" className={ENLACE_SECCION}>
                  Ver los {avisosRestantes.length} avisos
                  <IconChevronRight aria-hidden="true" className="size-4" />
                </Link>
              ) : undefined
            }
          >
            Avisos
          </SectionTitle>
          <NoticeCard notice={avisoDestacado} now={now} />
        </section>
      ) : null}

      <section aria-labelledby="salidas-inicio" className="flex flex-col gap-3">
        <SectionTitle
          id="salidas-inicio"
          action={
            <Link href="/mi/reservar" className={ENLACE_SECCION}>
              Ver todas las salidas
              <IconChevronRight aria-hidden="true" className="size-4" />
            </Link>
          }
        >
          Salen pronto
        </SectionTitle>
        <DepartureBoard
          departures={salidasVM}
          now={now}
          limit={4}
          label="Salidas de las próximas horas"
          hrefFor={(id) => `/mi/reservar?departureId=${id}`}
          emptyTitle="No hay salidas en las próximas horas"
          emptyDescription="Puede haber puestos en salidas de otros días."
          emptyAction={
            <Link href="/mi/reservar" className={buttonClass("secundario")}>
              Ver otros días
            </Link>
          }
        />
      </section>
    </div>
  );
}
