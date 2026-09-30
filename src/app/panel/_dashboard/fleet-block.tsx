import Link from "next/link";
import type { AgencyFleetStatus } from "@/modules/reports";
import { UNIT_STATE_LABELS, unitStateTone, type UnitState } from "@/lib/labels";
import { EmptyState, SectionCard, StatusBadge, panelButtonClass } from "@/components/panel-ui";
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
    <SectionCard
      title="Choferes y buses"
      description="Quién está en ruta, quién embarca y quién tiene viaje asignado."
      action={
        <Link href="/panel/flota" className={panelButtonClass("secundario")}>
          Ver la flota
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
              <p className="text-sm font-semibold text-tinta-suave">Buses por estado</p>
              <ul className="flex flex-wrap gap-2">
                {resumen.map((estado) => (
                  <li key={estado}>
                    <StatusBadge
                      label={`${UNIT_STATE_LABELS[estado]}: ${flota.vehicleSummary[estado]}`}
                      tone={unitStateTone(estado)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <ul className="flex flex-col divide-y divide-borde">
            {visibles.map((chofer) => {
              const viaje = describeUnitTrip({ current: chofer.current, upcoming: chofer.upcoming }, now);
              const placa = chofer.current?.vehiclePlate ?? chofer.upcoming[0]?.vehiclePlate;
              const linea = viaje
                ? [placa, viaje.title, viaje.detail].filter(Boolean).join(" · ")
                : "Sin viajes asignados esta semana";
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
    </SectionCard>
  );
}
