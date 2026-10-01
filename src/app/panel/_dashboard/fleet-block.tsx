import Link from "next/link";
import type { AgencyFleetStatus, UnitDeparture } from "@/modules/reports";
import { UNIT_STATE_LABELS, unitStateTone, type StatusTone, type UnitState } from "@/lib/labels";
import { countLabel } from "./text";
import { FLEET_SECTION } from "./section-texts";
import { EmptyState, StatusBadge, panelButtonClass } from "@/components/panel-ui";
import { DashboardSection } from "./section-card";
import { FLEET_DRIVER_ROW_CLASS, FLEET_LIST_CLASS, MAX_FILAS_MOVIL, mobileRowClass } from "./list-classes";
import { IconChevronRight, IconUsers, IconWarning } from "@/components/icons";
import { describeUnitTrip } from "../_shared/unit-trip";

/**
 * Estado de una unidad tal como lo dice el tablero. Es el de `unitStateOf`
 * salvo en un caso: una salida PROGRAMADA cuya hora ya pasó (`current.overdue`)
 * deja a la unidad en EMBARCANDO, pero nadie abrió el embarque. Aquí se dice
 * "Atrasado", igual que "Salidas de hoy" y "Lo que necesita tu atención" dicen
 * "Atrasada" de esa misma salida: si no, la misma pantalla decía que el bus
 * cargaba pasajeros y que nadie lo había despachado. Con el embarque abierto
 * (MANIFIESTO_CERRADO), aunque vaya tarde, "Embarcando" es correcto.
 */
type DashboardUnitState = UnitState | "ATRASADO";

function dashboardStateOf(unit: { state: UnitState; current: UnitDeparture | null }): DashboardUnitState {
  return unit.current?.overdue && unit.current.status === "PROGRAMADA" ? "ATRASADO" : unit.state;
}

function stateLabel(estado: DashboardUnitState): string {
  return estado === "ATRASADO" ? "Atrasado" : UNIT_STATE_LABELS[estado];
}

function stateTone(estado: DashboardUnitState): StatusTone {
  return estado === "ATRASADO" ? "alerta" : unitStateTone(estado);
}

/** Orden fijo del resumen de estados de vehículos, igual que en la pantalla de flota. */
const ORDEN_RESUMEN: readonly DashboardUnitState[] = [
  "EN_RUTA",
  "ATRASADO",
  "EMBARCANDO",
  "ASIGNADO",
  "DISPONIBLE",
  "FUERA_DE_SERVICIO",
];

/** Cómo se dice cada estado de un bus en una frase ("3 buses con viaje asignado"). */
const BUS_STATE_PHRASES: Record<DashboardUnitState, { singular: string; plural: string }> = {
  EN_RUTA: { singular: "bus en ruta", plural: "buses en ruta" },
  ATRASADO: { singular: "bus atrasado", plural: "buses atrasados" },
  EMBARCANDO: { singular: "bus embarcando", plural: "buses embarcando" },
  ASIGNADO: { singular: "bus con viaje asignado", plural: "buses con viaje asignado" },
  DISPONIBLE: { singular: "bus disponible", plural: "buses disponibles" },
  FUERA_DE_SERVICIO: { singular: "bus fuera de servicio", plural: "buses fuera de servicio" },
};

/**
 * La ruta como «origen → destino», igual que «Salidas de hoy» y «Lo que
 * necesita tu atención», en vez del nombre libre de la ruta («Caracas –
 * Mérida»): así el tablero escribe la ruta de una sola manera.
 */
function withArrowRoute(departure: UnitDeparture): UnitDeparture {
  return { ...departure, routeName: `${departure.origin} → ${departure.destination}` };
}

/**
 * Línea del viaje de un chofer: placa, ruta y hora, y si tiene más salidas
 * programadas en los próximos 7 días, cuántas («· 2 salidas más en 7 días»)
 * con el total real (`upcomingCount`), igual que la pantalla de flota. Con una
 * salida atrasada, `describeUnitTrip` ya muestra esa salida ("Debía salir a
 * las 21:00") sin sumar otras, y `late` pide pintarla en tono de alerta, como
 * en la pantalla de flota.
 */
function driverTripLine(
  chofer: AgencyFleetStatus["drivers"][number],
  now: Date,
): { text: string; late: boolean } {
  const viaje = describeUnitTrip(
    {
      current: chofer.current ? withArrowRoute(chofer.current) : null,
      upcoming: chofer.upcoming.map(withArrowRoute),
      upcomingCount: chofer.upcomingCount,
    },
    now,
  );
  if (!viaje) return { text: "Sin viajes en los próximos 7 días", late: false };
  const placa = chofer.current?.vehiclePlate ?? chofer.upcoming[0]?.vehiclePlate;
  return { text: [placa, viaje.title, viaje.detail].filter(Boolean).join(" · "), late: viaje.late === true };
}

/** Máximo de choferes que muestra la lista antes de remitir a la flota completa. */
const MAX_FILAS = 5;

/**
 * "Choferes y buses" del tablero: cuántos buses hay en cada estado y los
 * choferes con viaje en curso o próximo, cada uno en una línea.
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
  const visibles = relevantes.slice(0, MAX_FILAS);
  // El resumen se cuenta con el estado del tablero (con "Atrasado"), no con
  // `vehicleSummary`, para que diga lo mismo que la pastilla de cada chofer.
  const conteo = new Map<DashboardUnitState, number>();
  for (const vehiculo of flota.vehicles) {
    const estado = dashboardStateOf(vehiculo);
    conteo.set(estado, (conteo.get(estado) ?? 0) + 1);
  }
  const resumen = ORDEN_RESUMEN.filter((estado) => (conteo.get(estado) ?? 0) > 0);

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
                      tone={stateTone(estado)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <h3 className="text-base font-semibold text-tinta">Choferes</h3>
            <ul className={FLEET_LIST_CLASS}>
              {visibles.map((chofer, index) => {
                const linea = driverTripLine(chofer, now);
                const estado = dashboardStateOf(chofer);
                return (
                  <li key={chofer.id} className={`${FLEET_DRIVER_ROW_CLASS} ${mobileRowClass(index)}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-tinta">{chofer.fullName}</p>
                      <StatusBadge label={stateLabel(estado)} tone={stateTone(estado)} />
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
          </div>

          {/* En el teléfono se ven menos choferes: el enlace aparece desde el cuarto. */}
          {relevantes.length > MAX_FILAS_MOVIL ? (
            <Link
              href="/panel/flota?vista=choferes"
              className={`foco inline-flex min-h-11 w-fit items-center gap-1 rounded-control px-2 text-[15px] font-semibold text-marca-700 hover:bg-marca-50${relevantes.length > MAX_FILAS ? "" : " md:hidden"}`}
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
