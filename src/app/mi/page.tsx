import type { Metadata } from "next";
import Link from "next/link";
import { balanceUsd, listBookableDepartures } from "@/modules/catalog";
import { requirePassenger } from "@/modules/auth";
import { listNoticesForAccount } from "@/modules/notices";
import { prisma } from "@/lib/prisma";
import { formatUsdString } from "@/lib/decimal";
import { passengerStatusLabel } from "@/lib/labels";
import { buttonClass, Card, SectionTitle } from "@/components/ui";
import { NoticeCard } from "@/components/notice-card";
import { TicketCard, type TicketCardData } from "@/components/ticket-card";
import { DepartureBoard } from "@/components/departure-board";
import type { DepartureRowData } from "@/components/departure-row";
import { Isotipo } from "@/components/logo";
import { IconCamera, IconChevronRight, IconInfo, IconMapPin } from "@/components/icons";
import {
  heroDepartsSoon,
  heroDepartureTitle,
  pickHeroReservation,
  reservationActionLabel,
  ticketDeadline,
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

/**
 * Avisos que el héroe ya dice: el plazo de pago (va en el ticket), el pago en
 * revisión (la pastilla del ticket) y el ticket listo (el botón). Si su
 * reserva va en grande o como enlace debajo, no se repiten en "Avisos". Un
 * comprobante rechazado sí se muestra: dice algo que el ticket no dice.
 */
const AVISOS_QUE_DICE_EL_HEROE = new Set([
  "RESERVA_POR_LIBERAR",
  "RECONFIRMAR_PAGO_EN_SITIO",
  "COMPROBANTE_EN_VALIDACION",
  "TICKET_LISTO",
]);

/** "Revisando tu pago" → "revisando tu pago", para ir detrás de dos puntos. */
function lowerFirst(text: string): string {
  return text.length > 0 ? text[0]!.toLowerCase() + text.slice(1) : text;
}

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
 * tarde y no pide nada (pago en revisión o pagada), sube otra reserva con un
 * plazo de pago que vence pronto (el mismo que el ticket muestra, así el
 * título "Paga para no perder tu puesto" siempre lleva la hora debajo) o una
 * pagada en parte que sale dentro de 24 horas; el viaje más cercano queda
 * como enlace debajo.
 */
export default async function MiInicioPage() {
  const pasajero = await requirePassenger();
  const now = new Date();

  const dondeProximas = {
    accountId: pasajero.id,
    status: { in: [...ESTADOS_PROXIMO_VIAJE] },
    departure: { departsAt: { gt: now } },
  };

  const [avisos, proximas, totalProximas, salidasDeViajes, salidas] = await Promise.all([
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
  const codigosEnPantalla = new Set([ticketData?.code, viajeMasCercano?.code].filter(Boolean));
  const avisosRestantes = avisos.filter((aviso) => {
    if (heroEsCedula && aviso.kind === "DOCUMENTO_FALTANTE") return false;
    if (aviso.reservationCode && codigosEnPantalla.has(aviso.reservationCode) && AVISOS_QUE_DICE_EL_HEROE.has(aviso.kind)) {
      return false;
    }
    return true;
  });

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

  const accionPrincipal = ticketData
    ? eleccion?.promoted && ticketData.status === "PENDIENTE_PAGO"
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
            <TicketCard data={ticketData} size="compacta" />
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
            {viajeMasCercano ? (
              <Link href={`/mi/reservas/${viajeMasCercano.code}`} className={`${ENLACE_SECCION} self-center text-center`}>
                <span>
                  Tu viaje a {viajeMasCercano.departure.route.destination}:{" "}
                  {lowerFirst(passengerStatusLabel(viajeMasCercano.status))}
                </span>
                <IconChevronRight aria-hidden="true" className="size-4 shrink-0" />
              </Link>
            ) : null}
            {totalProximas > (viajeMasCercano ? 2 : 1) ? (
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

      {/*
        "Salen pronto" solo cuando no hay un viaje próximo: con uno, la acción
        principal es la de ese viaje y otra lista de salidas le quitaría peso
        (la pestaña Reservar sigue a un toque en la barra de abajo).
      */}
      {ticketData ? null : (
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
      )}
    </div>
  );
}
