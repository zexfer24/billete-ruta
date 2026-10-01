import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { balanceUsd, getCurrentDepartureTax, listBookableDepartures } from "@/modules/catalog";
import { requirePassenger } from "@/modules/auth";
import { listNoticesForAccount } from "@/modules/notices";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatUsdString } from "@/lib/decimal";
import { passengerStatusLabel } from "@/lib/labels";
import { buttonClass, Card, Pill, SectionTitle } from "@/components/ui";
import { NoticeCard } from "@/components/notice-card";
import { TicketCard, type TicketCardData } from "@/components/ticket-card";
import { DepartureBoard, DeparturePriceNote } from "@/components/departure-board";
import type { DepartureRowData } from "@/components/departure-row";
import { Isotipo } from "@/components/logo";
import { IconCamera, IconChevronRight, IconClock, IconInfo, IconMapPin } from "@/components/icons";
import {
  heroDepartsSoon,
  heroDepartureTitle,
  homeNotices,
  otherTripDeadlineLabel,
  passengerStatusTone,
  pickHeroReservation,
  reservationActionLabel,
  ticketDeadline,
  whenPhrase,
} from "@/components/passenger-copy";

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

/**
 * Próximas reservas que se leen para elegir la del héroe: cubren la salida
 * más cercana y las siguientes, donde puede estar una con plazo de pago.
 */
const LIMITE_PROXIMAS = 12;

/** Enlace de texto con área táctil de 44 px, para "Ver todos". */
const ENLACE_SECCION =
  "foco inline-flex min-h-11 items-center gap-1 rounded-control px-1 font-semibold text-marca-700 hover:underline";

/**
 * Inicio del pasajero (spec 7.1): arriba la acción que toca ahora, en grande
 * (pagar, ver el ticket, subir la cédula o reservar); debajo, como mucho un
 * aviso con el enlace al resto y, solo si no hay un viaje próximo, las
 * salidas de las próximas horas.
 *
 * El héroe lo elige `pickHeroReservation`: la reserva de la salida más
 * cercana, que nunca cede su lugar si sale dentro de 3 horas. Si sale más
 * tarde, sube otra reserva cuyo plazo de pago vence antes que el suyo (el
 * mismo que el ticket muestra, así el título "Paga para no perder tu puesto"
 * siempre lleva la hora debajo); si nada apura y el viaje más cercano no pide
 * nada, sube una pagada en parte que sale dentro de 24 horas. El viaje más
 * cercano queda debajo, en "Tus otros viajes", con cuándo sale, su estado, su
 * plazo si lo tiene y su acción: esa tarjeta reemplaza a sus avisos.
 */
export default async function MiInicioPage() {
  const pasajero = await requirePassenger();
  const now = new Date();

  const dondeProximas = {
    accountId: pasajero.id,
    status: { in: [...ESTADOS_PROXIMO_VIAJE] },
    departure: { departsAt: { gt: now } },
  };

  const [avisos, proximas, totalProximas, salidasDeViajes, salidas, tasa] = await Promise.all([
    listNoticesForAccount(pasajero.id),
    prisma.reservation.findMany({
      where: dondeProximas,
      orderBy: [{ departure: { departsAt: "asc" } }, { code: "asc" }],
      take: LIMITE_PROXIMAS,
      include: { departure: { include: { route: { include: { agency: true } } } } },
    }),
    prisma.reservation.count({ where: dondeProximas }),
    // Un viaje es una salida: dos reservas de la misma salida son un solo viaje.
    prisma.reservation.findMany({ where: dondeProximas, distinct: ["departureId"], select: { departureId: true } }),
    listBookableDepartures({ to: new Date(now.getTime() + SEIS_HORAS_MS), onlyWithSeats: true }, now),
    // Sin tasa vigente la nota de precio dice solo "por persona", como en la portada.
    getCurrentDepartureTax(now).catch(() => null),
  ]);

  const eleccion = pickHeroReservation(
    proximas.map((reserva) => ({
      reserva,
      code: reserva.code,
      status: reserva.status,
      departsAt: reserva.departure.departsAt,
      expiresAt: reserva.expiresAt,
      reconfirmedAt: reserva.reconfirmedAt,
    })),
    now,
  );
  const proximaReserva = eleccion?.hero.reserva ?? null;
  const salePronto = proximaReserva ? heroDepartsSoon(proximaReserva.departure.departsAt, now) : false;
  // Con un héroe que sube por su plazo, el viaje más cercano queda a un toque.
  const viajeMasCercano = eleccion?.promoted ? eleccion.soonest.reserva : null;

  const totalViajes = salidasDeViajes.length;
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
        deadline: ticketDeadline(
          {
            status: proximaReserva.status,
            departsAt: proximaReserva.departure.departsAt,
            expiresAt: proximaReserva.expiresAt,
            reconfirmedAt: proximaReserva.reconfirmedAt,
          },
          now,
        ),
      }
    : null;

  // Si la acción principal ya es subir la cédula, su aviso no se repite debajo;
  // tampoco lo que ya dicen la reserva en grande y el enlace al viaje más cercano.
  const heroEsCedula = !ticketData && faltaCedula;
  const codigosEnPantalla = new Set(
    [ticketData?.code, viajeMasCercano?.code].filter((code): code is string => Boolean(code)),
  );
  const avisosRestantes = homeNotices(avisos, { codesOnScreen: codigosEnPantalla, heroIsDocument: heroEsCedula });

  // El título dice lo que apura: un plazo (con su hora en el ticket), la salida inminente o el pago pendiente.
  const tituloHeroe = ticketData
    ? ticketData.deadline
      ? "Paga para no perder tu puesto"
      : salePronto
        ? heroDepartureTitle(ticketData.departsAt, now)
        : eleccion?.promoted && ticketData.status === "ABONADA"
          ? "Termina de pagar tu viaje"
          : "Tu próximo viaje"
    : null;

  // Pagar se dice con la ruta: el botón está debajo del ticket, pero es la acción de toda la pantalla.
  const accionPrincipal = ticketData
    ? ticketData.status === "PENDIENTE_PAGO"
      ? `Pagar mi viaje a ${ticketData.destination}`
      : reservationActionLabel(ticketData.status, formatUsdString(ticketData.balanceUsd))
    : null;
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
              {tituloHeroe}
            </h1>
            <TicketCard data={ticketData} size="compacta" now={now} />
            {salePronto && proximaReserva ? (
              <div className="flex flex-col gap-2 text-tinta">
                <p className="flex items-start gap-2">
                  <IconMapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-marca-600" />
                  <span>
                    <span className="font-semibold">Aborda en:</span> {proximaReserva.departure.route.meetingPoint}
                  </span>
                </p>
                {ticketData.status === "EN_VALIDACION" ? (
                  <p className="flex items-start gap-2">
                    <IconInfo aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-info" />
                    <span>
                      Si no confirmamos tu pago antes de la salida, acércate con tu cédula a la taquilla de{" "}
                      {ticketData.agencyName}.
                    </span>
                  </p>
                ) : null}
              </div>
            ) : null}
            <Link
              href={`/mi/reservas/${ticketData.code}`}
              className={buttonClass("primario", "w-full", "lg")}
            >
              {accionPrincipal}
            </Link>
            {/* Con el viaje más cercano en su propia sección, "Ver todos" va en el título de esa sección. */}
            {!viajeMasCercano && totalProximas > 1 ? (
              <Link href="/mi/reservas" className={`${ENLACE_SECCION} self-center`}>
                {totalViajes > 1
                  ? `Tienes ${totalViajes} viajes próximos · Ver todos`
                  : `Tienes ${totalProximas} reservas en este viaje · Ver todas`}
                <IconChevronRight aria-hidden="true" className="size-4" />
              </Link>
            ) : null}
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

      {viajeMasCercano ? (
        <section aria-labelledby="otros-viajes" className="flex flex-col gap-3">
          <SectionTitle
            id="otros-viajes"
            action={
              totalProximas > 2 ? (
                <Link href="/mi/reservas" className={ENLACE_SECCION}>
                  {totalViajes > 1 ? `Ver los ${totalViajes} viajes` : `Ver las ${totalProximas} reservas`}
                  <IconChevronRight aria-hidden="true" className="size-4" />
                </Link>
              ) : undefined
            }
          >
            {totalProximas > 2 ? "Tus otros viajes" : "Tu otro viaje"}
          </SectionTitle>
          <OtroViajeCard reserva={viajeMasCercano} now={now} />
        </section>
      ) : null}

      {avisoDestacado ? (
        <section aria-labelledby="avisos-inicio" className="flex flex-col gap-3">
          <SectionTitle
            id="avisos-inicio"
            action={
              avisosRestantes.length > 1 ? (
                <Link href="/mi/avisos" className={ENLACE_SECCION}>
                  Ver todos los avisos
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

      {/*
        "Salen pronto" solo cuando no hay un viaje próximo: con uno, la acción
        principal es la de ese viaje y otra lista de salidas le quitaría peso
        (la pestaña Reservar sigue a un toque en la barra de abajo).
      */}
      {ticketData ? null : (
        <section aria-labelledby="salidas-inicio" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
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
            {/* La tarjeta muestra la tarifa; la tasa del terminal se avisa aquí, como en la portada. */}
            {salidasVM.length > 0 ? (
              <DeparturePriceNote taxLabel={tasa ? formatMoney(tasa, "USD") : null} />
            ) : null}
          </div>
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
      )}
    </div>
  );
}

interface OtroViajeProps {
  reserva: {
    code: string;
    status: string;
    totalUsd: Prisma.Decimal;
    paidUsd: Prisma.Decimal;
    expiresAt: Date | null;
    reconfirmedAt: Date | null;
    departure: { departsAt: Date; route: { origin: string; destination: string } };
  };
  now: Date;
}

/**
 * El viaje más cercano cuando otra reserva subió en grande: cuándo sale, su
 * plazo de pago si lo tiene, su estado y su acción, con los mismos textos que
 * su ticket en Mis viajes. Como reemplaza a los avisos de esa reserva en el
 * inicio (`homeNotices`), nunca calla la hora límite ni lo que falta pagar.
 */
function OtroViajeCard({ reserva, now }: OtroViajeProps) {
  const { departsAt, route } = reserva.departure;
  const plazo = otherTripDeadlineLabel(
    { status: reserva.status, departsAt, expiresAt: reserva.expiresAt, reconfirmedAt: reserva.reconfirmedAt },
    now,
  );
  const saldo = formatUsdString(balanceUsd(reserva.totalUsd, reserva.paidUsd).toString());

  return (
    <Link
      href={`/mi/reservas/${reserva.code}`}
      className="foco block rounded-tarjeta border border-borde bg-superficie p-4 shadow-1 transition-shadow duration-150 ease-out hover:shadow-2 motion-reduce:transition-none"
    >
      <p className="text-pretty font-semibold leading-snug text-tinta">
        Tu viaje a {route.destination} sale <span className="tabular">{whenPhrase(departsAt, now)}</span>
        <span className="sr-only">, desde {route.origin}</span>
      </p>
      {plazo ? (
        <p className="tabular mt-2 flex items-start gap-2 text-sm font-semibold text-alerta">
          <IconClock aria-hidden="true" className="mt-px size-5 shrink-0" />
          <span>{plazo}</span>
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-borde pt-3">
        <Pill tone={passengerStatusTone(reserva.status)}>{passengerStatusLabel(reserva.status)}</Pill>
        <span className="inline-flex items-center gap-1 font-semibold text-marca-700">
          {reservationActionLabel(reserva.status, saldo)}
          <IconChevronRight aria-hidden="true" className="size-5 shrink-0" />
        </span>
      </div>
    </Link>
  );
}
