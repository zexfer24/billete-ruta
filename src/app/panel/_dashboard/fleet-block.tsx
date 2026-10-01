import Link from "next/link";
import type { AgencyFleetStatus } from "@/modules/reports";
import { UNIT_STATE_LABELS, unitStateTone, type UnitState } from "@/lib/labels";
import { countLabel } from "./text";
import { FLEET_SECTION } from "./section-texts";
import { EmptyState, StatusBadge, panelButtonClass } from "@/components/panel-ui";
import { DashboardSection } from "./section-card";
import { IconChevronRight, IconUsers } from "@/components/icons";
import { describeUnitTrip } from "../_shared/unit-trip";

/** Orden fijo del resumen de estados de vehículos, igual que en la pantalla de flota. */
const ORDEN_RESUMEN: readonly UnitState[] = [
  "EN_RUTA",
  "EMBARCANDO",
  "ASIGNADO",
  "DISPONIBLE",
  "FUERA_DE_SERVICIO",
];

/** Cómo se dice cada estado de un bus en una frase ("3 buses con viaje asignado"). */
const BUS_STATE_PHRASES: Record<UnitState, { singular: string; plural: string }> = {
  EN_RUTA: { singular: "bus en ruta", plural: "buses en ruta" },
  EMBARCANDO: { singular: "bus embarcando", plural: "buses embarcando" },
  ASIGNADO: { singular: "bus con viaje asignado", plural: "buses con viaje asignado" },
  DISPONIBLE: { singular: "bus disponible", plural: "buses disponibles" },
  FUERA_DE_SERVICIO: { singular: "bus fuera de servicio", plural: "buses fuera de servicio" },
};

/**
 * Línea del viaje de un chofer: placa, ruta y hora. Si además tiene otras
 * salidas programadas en los próximos 7 días lo dice en palabras ("y otro
 * viaje esta semana") en vez de "+N más". La lista de próximas salidas llega
 * recortada a tres, así que con tres no se da una cifra exacta.
 */
function driverTripLine(chofer: AgencyFleetStatus["drivers"][number], now: Date): string {
  const viaje = describeUnitTrip({ current: chofer.current, upcoming: chofer.upcoming.slice(0, 1) }, now);
  if (!viaje) return "Sin viajes asignados esta semana";
  const placa = chofer.current?.vehiclePlate ?? chofer.upcoming[0]?.vehiclePlate;
  const enCurso = chofer.current?.status === "EN_RUTA" || chofer.current?.status === "MANIFIESTO_CERRADO";
  const otros = enCurso ? 0 : chofer.upcoming.length - 1;
  const linea = [placa, viaje.title, viaje.detail].filter(Boolean).join(" · ");
  if (otros <= 0) return linea;
  return `${linea}, y ${otros === 1 ? "otro viaje" : "otros viajes"} esta semana`;
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
  const resumen = ORDEN_RESUMEN.filter((estado) => flota.vehicleSummary[estado] > 0);

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
                        flota.vehicleSummary[estado],
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
            <ul className="flex flex-col divide-y divide-borde">
              {visibles.map((chofer) => {
                const linea = driverTripLine(chofer, now);
                return (
                  <li key={chofer.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-tinta">{chofer.fullName}</p>
                      <StatusBadge label={UNIT_STATE_LABELS[chofer.state]} tone={unitStateTone(chofer.state)} />
                    </div>
                    <p className="tabular text-sm text-tinta-suave">{linea}</p>
                  </li>
                );
              })}
            </ul>
          </div>

          {relevantes.length > MAX_FILAS ? (
            <Link
              href="/panel/flota?vista=choferes"
              className="foco inline-flex min-h-11 w-fit items-center gap-1 rounded-control px-2 text-[15px] font-semibold text-marca-700 hover:bg-marca-50"
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
