import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listBookableDepartures } from "@/modules/catalog";
import { currentPassenger } from "@/modules/auth";
import { Alert } from "@/components/alert";
import { DepartureCard } from "@/components/departure-board";
import type { DepartureRowData } from "@/components/departure-row";
import { IconCheckCircle, IconInfo, IconSeat } from "@/components/icons";
import { buttonClass, Pill } from "@/components/ui";
import { passengerHref } from "../../_publico/links";
import { PublicCard, PublicShell } from "../../_publico/public-shell";
import { getActiveClaim } from "./claim";
import { OtherDepartureActions, StateIcon } from "./inactive-link";
import {
  claimActionLabel,
  claimDeadlineLabel,
  claimRemainingLabel,
  claimTitle,
  heldSeatsLabel,
} from "../waitlist-labels";

export const metadata: Metadata = { title: "Lista de espera" };

export default async function ListaEsperaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // El layout ya validó el enlace y respondió 404 si no está activo; esta
  // consulta es la misma (compartida con `cache`), no una segunda.
  const [vigente, pasajero] = await Promise.all([getActiveClaim(token), currentPassenger()]);
  if (!vigente) {
    notFound();
  }
  const { aviso, claimExpiresAt, now } = vigente;
  const loggedIn = pasajero !== null;

  // Salida todavía reservable, con la agencia y los datos de la ruta.
  const reservables = await listBookableDepartures(
    { routeId: aviso.departure.routeId, to: new Date(aviso.departure.departsAt.getTime() + 60_000) },
    now,
  );
  const reservable = reservables.find((salida) => salida.id === aviso.departureId);

  if (!reservable) {
    return (
      <PublicShell>
        <PublicCard
          eyebrow={<StateIcon tone="marca" icon={<IconInfo />} />}
          title="Esta salida ya no admite reservas"
          description={`La salida de ${aviso.departure.route.origin} a ${aviso.departure.route.destination} ya no está disponible. Todavía puedes buscar otra salida con puestos.`}
        >
          <OtherDepartureActions loggedIn={loggedIn} />
        </PublicCard>
      </PublicShell>
    );
  }

  const salida: DepartureRowData = {
    id: reservable.id,
    agencyId: reservable.agencyId,
    agencyName: reservable.agencyName,
    origin: reservable.origin,
    destination: reservable.destination,
    departsAt: reservable.departsAt,
    estimatedMinutes: reservable.estimatedMinutes,
    fareUsd: reservable.fareUsd.toString(),
    available: reservable.available,
    capacity: reservable.capacity,
  };
  const puestos = aviso.passengerCount;
  const rutaReserva = `/mi/reservar?departureId=${encodeURIComponent(aviso.departureId)}&pasajeros=${puestos}`;

  return (
    <PublicShell>
      <PublicCard
        eyebrow={
          <Pill tone="exito" icon={<IconCheckCircle />}>
            Puesto disponible
          </Pill>
        }
        title={claimTitle(puestos)}
        description="Estabas en la lista de espera de esta salida. Todavía no está reservado: resérvalo y págalo antes de que se acabe el tiempo."
      >
        <Alert
          tone="alerta"
          role="none"
          title={`Resérvalo antes de ${claimDeadlineLabel(claimExpiresAt, now)}`}
        >
          <p className="tabular font-semibold">{claimRemainingLabel(claimExpiresAt, now)}.</p>
          <p>Después, el puesto pasa a la siguiente persona de la lista.</p>
        </Alert>

        <DepartureCard departure={salida} now={now} hideSeats />

        <p className="flex items-center gap-2 text-base font-semibold text-tinta">
          <IconSeat aria-hidden="true" className="size-5 shrink-0 text-marca-600" />
          {heldSeatsLabel(puestos)}
        </p>

        <div className="flex flex-col gap-2">
          <Link href={passengerHref(rutaReserva, loggedIn)} className={buttonClass("primario", "w-full", "lg")}>
            {claimActionLabel(puestos)}
          </Link>
          {loggedIn ? null : (
            <p className="text-center text-sm text-tinta-suave">
              Te pediremos que ingreses con tu cédula para reservar.
            </p>
          )}
        </div>
      </PublicCard>
    </PublicShell>
  );
}
