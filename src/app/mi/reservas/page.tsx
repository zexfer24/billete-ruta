import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requirePassenger } from "@/modules/auth";
import { balanceUsd } from "@/modules/catalog";
import { prisma } from "@/lib/prisma";
import { splitByDeparture } from "@/lib/reservations";
import { Alert } from "@/components/alert";
import { buttonClass, EmptyState } from "@/components/ui";
import { cx } from "@/components/ui-classes";
import { TicketCard, type TicketCardData } from "@/components/ticket-card";
import { Isotipo } from "@/components/logo";
import { deadlineBeforePhrase, reservationUrgency, ticketDeadline } from "@/components/passenger-copy";
import { SkeletonScreen } from "@/components/skeleton";
import { SkeletonTicketCompact } from "../_components/skeletons";

export const metadata: Metadata = {
  title: "Mis viajes",
};

type Vista = "proximos" | "pasados";

/** Viajes pasados que se muestran; los más viejos no aportan y hacen lenta la pantalla. */
const LIMITE_PASADOS = 30;

/** Reservas que se leen de la base: de sobra para un pasajero, con tope para no cargar historiales enormes. */
const LIMITE_CONSULTA = 200;

/** `?ver=pasados` muestra los pasados; cualquier otro valor (o ninguno), los próximos. */
function vistaDe(ver: string | string[] | undefined): Vista {
  return ver === "pasados" ? "pasados" : "proximos";
}

/**
 * Mis viajes: control de dos opciones (Próximos y Pasados) como navegación
 * con `aria-current`, no como pestañas ARIA, y la lista de tickets de la
 * opción elegida, que se carga dentro de su propio `<Suspense>`.
 */
export default async function MisReservasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const vista = vistaDe((await searchParams).ver);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Mis viajes</h1>

      <nav aria-label="Qué viajes ver">
        <ul className="flex gap-1 rounded-pastilla border border-borde bg-superficie p-1 shadow-1">
          <SegmentLink href="/mi/reservas" active={vista === "proximos"}>
            Próximos
          </SegmentLink>
          <SegmentLink href="/mi/reservas?ver=pasados" active={vista === "pasados"}>
            Pasados
          </SegmentLink>
        </ul>
      </nav>

      <Suspense key={vista} fallback={<ListaSkeleton />}>
        <ListaViajes vista={vista} />
      </Suspense>
    </div>
  );
}

function SegmentLink({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <li className="flex-1">
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cx(
          "foco flex min-h-11 items-center justify-center rounded-pastilla px-4 text-base transition-colors duration-150 ease-out motion-reduce:transition-none",
          active
            ? "bg-marca-50 font-bold text-marca-700 ring-1 ring-marca-200"
            : "font-medium text-tinta-suave hover:bg-lienzo hover:text-tinta",
        )}
      >
        {children}
      </Link>
    </li>
  );
}

function ListaSkeleton() {
  return (
    <SkeletonScreen label="Cargando tus viajes…" className="flex flex-col gap-4">
      <SkeletonTicketCompact withAction />
      <SkeletonTicketCompact withAction />
      <SkeletonTicketCompact withAction />
    </SkeletonScreen>
  );
}

async function ListaViajes({ vista }: { vista: Vista }) {
  const pasajero = await requirePassenger();
  const now = new Date();

  const reservas = await prisma.reservation.findMany({
    where: { accountId: pasajero.id },
    include: { departure: { include: { route: { include: { agency: true } } } } },
    orderBy: { createdAt: "desc" },
    take: LIMITE_CONSULTA,
  });

  const { proximas, pasadas } = splitByDeparture(reservas, now);
  // Próximos: el que sale antes va primero y, en una misma salida, lo más urgente
  // (lo que se pierde si no se paga). Pasados: el más reciente primero.
  const lista =
    vista === "pasados"
      ? [...pasadas]
          .sort((a, b) => b.departure.departsAt.getTime() - a.departure.departsAt.getTime())
          .slice(0, LIMITE_PASADOS)
      : [...proximas].sort(
          (a, b) =>
            a.departure.departsAt.getTime() - b.departure.departsAt.getTime() ||
            reservationUrgency(a.status) - reservationUrgency(b.status) ||
            a.code.localeCompare(b.code),
        );

  const datos: TicketCardData[] = lista.map((reserva) => ({
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
    // La reserva que se libera pronto dice su hora límite en la propia tarjeta.
    deadline:
      vista === "pasados"
        ? null
        : ticketDeadline(
            {
              status: reserva.status,
              departsAt: reserva.departure.departsAt,
              expiresAt: reserva.expiresAt,
              reconfirmedAt: reserva.reconfirmedAt,
            },
            now,
          ),
  }));

  if (datos.length === 0) {
    return (
      <EmptyState
        icon={<Isotipo tone="marca" decorative className="h-8 w-auto" />}
        title={vista === "pasados" ? "Aún no tienes viajes pasados" : "No tienes viajes próximos"}
        description={
          vista === "pasados"
            ? "Aquí verás los viajes que ya hiciste."
            : "Reserva tu puesto y aquí verás tu ticket y lo que falta por pagar."
        }
        action={
          <Link href="/mi/reservar" className={buttonClass("primario")}>
            Reservar un viaje
          </Link>
        }
      />
    );
  }

  // La lista sigue por fecha; si alguna reserva está por perder el puesto, un
  // solo aviso arriba dice cuál vence primero, con la misma hora de su tarjeta.
  const masUrgente = datos.reduce<TicketCardData | null>(
    (elegida, data) =>
      data.deadline && (!elegida?.deadline || data.deadline.at < elegida.deadline.at) ? data : elegida,
    null,
  );

  return (
    <div className="flex flex-col gap-3">
      {masUrgente?.deadline ? (
        <Alert
          tone="alerta"
          role="none"
          className="mb-1"
          title={`${
            masUrgente.status === "PAGO_EN_SITIO" ? "Paga en la taquilla tu viaje" : "Paga tu viaje"
          } a ${masUrgente.destination} ${deadlineBeforePhrase(masUrgente.deadline, now)}`}
          action={
            <Link href={`/mi/reservas/${masUrgente.code}`} className={buttonClass("primario", undefined, "sm")}>
              {masUrgente.status === "PAGO_EN_SITIO"
                ? "Ver cómo pagar en la taquilla"
                : `Pagar mi viaje a ${masUrgente.destination}`}
            </Link>
          }
        >
          {masUrgente.deadline.boundByDeparture
            ? "Si no, pierdes el viaje."
            : "Si no, el puesto se libera para otra persona."}
        </Alert>
      ) : null}
      <ul className="flex flex-col gap-4">
        {datos.map((data) => (
          <li key={data.code}>
            <TicketCard data={data} size="compacta" href={`/mi/reservas/${data.code}`} now={now} />
          </li>
        ))}
      </ul>
      {vista === "pasados" && pasadas.length > LIMITE_PASADOS ? (
        <p className="text-center text-sm text-tinta-suave">
          Mostramos tus últimos {LIMITE_PASADOS} viajes.
        </p>
      ) : null}
    </div>
  );
}
