import Link from "next/link";
import type { AgencyFleetStatus, UnitDeparture } from "@/modules/reports";
import { UNIT_STATE_LABELS, unitStateTone, type UnitState } from "@/lib/labels";
import { formatCaracasDate } from "@/lib/time";
import { countLabel, todayTripsNote } from "./text";
import { FLEET_SECTION } from "./section-texts";
import { EmptyState, StatusBadge, panelButtonClass } from "@/components/panel-ui";
import { DashboardSection } from "./section-card";
import {
  FLEET_DRIVER_ROW_CLASS,
  FLEET_LIST_CLASS,
  FLEET_MAX_FILAS,
  FLEET_MORE_LINK_CLASS,
  FLEET_NOTE_CLASS,
  MAX_FILAS_MOVIL,
  mobileRowClass,
} from "./list-classes";
import { IconChevronRight, IconUsers, IconWarning } from "@/components/icons";
import { describeUnitTrip } from "../_shared/unit-trip";

type Chofer = AgencyFleetStatus["drivers"][number];

/**
 * Orden por urgencia, el mismo del resumen de buses y de la pantalla de flota:
 * lo que está pasando ahora va primero.
 */
const ORDEN_ESTADOS: readonly UnitState[] = [
  "EN_RUTA",
  "ATRASADO",
  "EMBARCANDO",
  "ASIGNADO",
  "DISPONIBLE",
  "FUERA_DE_SERVICIO",
];

/** Cómo se dice cada estado de un bus en una frase ("3 buses con viaje asignado"). */
const BUS_STATE_PHRASES: Record<UnitState, { singular: string; plural: string }> = {
  EN_RUTA: { singular: "bus en ruta", plural: "buses en ruta" },
  ATRASADO: { singular: "bus atrasado", plural: "buses atrasados" },
  EMBARCANDO: { singular: "bus embarcando", plural: "buses embarcando" },
  ASIGNADO: { singular: "bus con viaje asignado", plural: "buses con viaje asignado" },
  DISPONIBLE: { singular: "bus disponible", plural: "buses disponibles" },
  FUERA_DE_SERVICIO: { singular: "bus fuera de servicio", plural: "buses fuera de servicio" },
};

/** El viaje que decide la línea del chofer: el que lleva ahora o, si no, el próximo. */
function tripOf(chofer: Chofer): UnitDeparture | undefined {
  return chofer.current ?? chofer.upcoming[0];
}

/**
 * Primero por urgencia y, dentro de un mismo estado, por la hora de su viaje
 * (los que no tienen viaje, al final); el nombre solo desempata. Así el que
 * sale antes queda arriba, y no el que va primero en el abecedario.
 */
function compareByUrgency(a: Chofer, b: Chofer): number {
  const porEstado = ORDEN_ESTADOS.indexOf(a.state) - ORDEN_ESTADOS.indexOf(b.state);
  if (porEstado !== 0) return porEstado;
  const horaA = tripOf(a)?.departsAt.getTime() ?? Number.POSITIVE_INFINITY;
  const horaB = tripOf(b)?.departsAt.getTime() ?? Number.POSITIVE_INFINITY;
  if (horaA !== horaB) return horaA < horaB ? -1 : 1;
  return a.fullName.localeCompare(b.fullName);
}

/**
 * Si el chofer ya aparece, con su placa, ruta y hora, en "Salidas de hoy",
 * justo encima: no lleva ningún viaje ahora y el próximo es de hoy. Repetirlo
 * aquí era la misma tabla dos veces. Los que están en ruta, embarcando,
 * atrasados o fuera de servicio sí se listan (su pastilla dice algo que la
 * tabla no dice), igual que los que no tienen viaje hoy.
 */
function isAlreadyInTodayTrips(chofer: Chofer, now: Date): boolean {
  if (chofer.state !== "ASIGNADO" && chofer.state !== "DISPONIBLE") return false;
  const viaje = tripOf(chofer);
  return viaje !== undefined && formatCaracasDate(viaje.departsAt) === formatCaracasDate(now);
}

/**
 * La ruta como «origen → destino», igual que «Salidas de hoy» y «Lo que
 * necesita tu atención», en vez del nombre libre de la ruta («Caracas –
 * Mérida»): así el tablero escribe la ruta de una sola manera.
 */
function withArrowRoute(departure: UnitDeparture): UnitDeparture {
  return { ...departure, routeName: `${departure.origin} → ${departure.destination}` };
}

/**
 * Línea del viaje de un chofer en el tablero: placa, ruta y hora de lo que
 * toca ahora ("AC456EF · Caracas → Mérida · Hoy 10:00"). Sin el conteo de
 * salidas de la semana ("· 4 salidas más en 7 días"): no ayuda a decidir nada
 * aquí, alargaba cada fila y vive en la pantalla de flota. Por eso se pasa
 * solo la próxima salida. Con una salida atrasada, `describeUnitTrip` ya
 * muestra esa salida ("Debía salir a las 21:00") y `late` pide pintarla en
 * tono de alerta, como en la pantalla de flota.
 */
function driverTripLine(
  chofer: Chofer,
  now: Date,
): { text: string; late: boolean } {
  const proxima = chofer.upcoming.slice(0, 1).map(withArrowRoute);
  const viaje = describeUnitTrip(
    {
      current: chofer.current ? withArrowRoute(chofer.current) : null,
      upcoming: proxima,
      upcomingCount: proxima.length,
    },
    now,
  );
  if (!viaje) return { text: "Sin viajes en los próximos 7 días", late: false };
  const placa = chofer.current?.vehiclePlate ?? chofer.upcoming[0]?.vehiclePlate;
  return { text: [placa, viaje.title, viaje.detail].filter(Boolean).join(" · "), late: viaje.late === true };
}

/**
 * Estados de chofer que llevan pastilla en el tablero: los que piden mirar o
 * cambian lo que se hace (en ruta, embarcando, atrasado, fuera de servicio).
 * "Asignado" y "Disponible" no la llevan: la línea del viaje ya lo dice
 * ("Hoy 10:00" o "Sin viajes"), y cinco pastillas iguales no distinguían a
 * nadie.
 */
function showsDriverBadge(estado: UnitState): boolean {
  return estado !== "ASIGNADO" && estado !== "DISPONIBLE";
}

/**
 * "Choferes y buses" del tablero: cuántos buses hay en cada estado y los
 * choferes que dicen algo que "Salidas de hoy" no dice (en ruta, embarcando,
 * atrasados, fuera de servicio o sin viaje hoy), del más urgente al menos
 * urgente. Los que solo tienen su viaje de hoy asignado se cuentan en una
 * línea, porque ya salen en la tabla de arriba.
 */
export async function FleetBlock({
  fleet,
  now,
  registerDriverHref,
}: {
  fleet: Promise<AgencyFleetStatus>;
  now: Date;
  registerDriverHref: string;
}) {
  const flota = await fleet;
  const relevantes = flota.drivers.filter((chofer) => chofer.active || chofer.current);
  const destacados = relevantes.filter((chofer) => !isAlreadyInTodayTrips(chofer, now)).sort(compareByUrgency);
  const visibles = destacados.slice(0, FLEET_MAX_FILAS);
  const enSalidasDeHoy = relevantes.length - destacados.length;
  const conteo = new Map<UnitState, number>();
  for (const vehiculo of flota.vehicles) {
    conteo.set(vehiculo.state, (conteo.get(vehiculo.state) ?? 0) + 1);
  }
  const resumen = ORDEN_ESTADOS.filter((estado) => (conteo.get(estado) ?? 0) > 0);
  // El enlace a la flota completa aparece si quedan choferes sin mostrar: en
  // escritorio, más allá de las cinco filas o de los que están en "Salidas de
  // hoy"; en el teléfono, que muestra tres filas, también desde el cuarto.
  const ocultosEnEscritorio = relevantes.length > visibles.length;
  const ocultosEnTelefono = relevantes.length > Math.min(visibles.length, MAX_FILAS_MOVIL);

  return (
    <DashboardSection
      title={FLEET_SECTION.title}
      description={FLEET_SECTION.description}
      action={
        <Link href="/panel/flota" className={panelButtonClass("secundario")}>
          {FLEET_SECTION.actionLabel}
        </Link>
      }
    >
      {relevantes.length === 0 ? (
        <EmptyState
          icon={<IconUsers />}
          title="No hay choferes activos"
          description="Registra a tus choferes para poder asignarlos a las salidas."
          action={
            <Link href={registerDriverHref} scroll={false} className={panelButtonClass("secundario")}>
              Registrar un chofer
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {resumen.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-semibold text-tinta">Buses</h3>
              <ul className="flex flex-wrap gap-2">
                {resumen.map((estado) => (
                  <li key={estado}>
                    <StatusBadge
                      label={countLabel(
                        conteo.get(estado) ?? 0,
                        BUS_STATE_PHRASES[estado].singular,
                        BUS_STATE_PHRASES[estado].plural,
                      )}
                      tone={unitStateTone(estado)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <h3 className="text-base font-semibold text-tinta">Choferes</h3>
            {visibles.length > 0 ? (
              <ul className={FLEET_LIST_CLASS}>
                {visibles.map((chofer, index) => {
                  const linea = driverTripLine(chofer, now);
                  return (
                    <li key={chofer.id} className={`${FLEET_DRIVER_ROW_CLASS} ${mobileRowClass(index)}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-tinta">{chofer.fullName}</p>
                        {showsDriverBadge(chofer.state) ? (
                          <StatusBadge label={UNIT_STATE_LABELS[chofer.state]} tone={unitStateTone(chofer.state)} />
                        ) : null}
                      </div>
                      {linea.late ? (
                        <p className="tabular flex items-start gap-1.5 text-sm font-semibold text-alerta">
                          <IconWarning className="mt-0.5 size-4 shrink-0" />
                          <span>{linea.text}</span>
                        </p>
                      ) : (
                        <p className="tabular text-sm text-tinta-suave">{linea.text}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {enSalidasDeHoy > 0 ? (
              <p className={FLEET_NOTE_CLASS}>{todayTripsNote(enSalidasDeHoy, visibles.length > 0)}</p>
            ) : null}
          </div>

          {ocultosEnTelefono ? (
            <Link
              href="/panel/flota?vista=choferes"
              className={`${FLEET_MORE_LINK_CLASS}${ocultosEnEscritorio ? "" : " md:hidden"}`}
            >
              Ver los {relevantes.length} choferes
              <IconChevronRight className="size-5" />
            </Link>
          ) : null}
        </div>
      )}
    </DashboardSection>
  );
}
