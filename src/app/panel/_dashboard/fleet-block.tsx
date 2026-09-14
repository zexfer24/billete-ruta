import Link from "next/link";
import type { AgencyFleetStatus } from "@/modules/reports";
import { UNIT_STATE_LABELS, unitStateTone, type UnitState } from "@/lib/labels";
import { EmptyState, SectionCard, StatusBadge, panelButtonClass } from "@/components/panel-ui";
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
const MAX_FILAS = 8;

/**
 * Bloque "Flota en operación" del tablero: resumen de vehículos por estado y
 * la lista de choferes activos o con viaje en curso, con su unidad y ruta.
 */
export function FleetBlock({
  fleet,
  now,
  registrarChoferHref,
}: {
  fleet: AgencyFleetStatus;
  now: Date;
  registrarChoferHref: string;
}) {
  const relevantes = fleet.drivers.filter((chofer) => chofer.active || chofer.current);
  const visibles = relevantes.slice(0, MAX_FILAS);

  return (
    <SectionCard
      title="Flota en operación"
      description="Choferes activos, estado de su unidad y su ruta en curso o próximas salidas"
      action={
        <Link href="/panel/flota" className={panelButtonClass("secundario", "sm")}>
          Ver flota
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        {relevantes.length === 0 ? (
          <EmptyState
            title="No hay choferes activos."
            action={
              <Link href={registrarChoferHref} scroll={false} className={panelButtonClass("primario", "sm")}>
                Registrar chofer
              </Link>
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-texto-suave)]">
              <span>Unidades:</span>
              {ORDEN_RESUMEN.filter((estado) => fleet.vehicleSummary[estado] > 0).map((estado) => (
                <StatusBadge
                  key={estado}
                  label={`${UNIT_STATE_LABELS[estado]} · ${fleet.vehicleSummary[estado]}`}
                  tone={unitStateTone(estado)}
                />
              ))}
            </div>

            <ul className="flex flex-col divide-y divide-[var(--color-borde)]">
              {visibles.map((chofer) => {
                const viaje = describeUnitTrip({ current: chofer.current, upcoming: chofer.upcoming }, now);
                const unidad =
                  chofer.current?.vehiclePlate ?? chofer.upcoming[0]?.vehiclePlate ?? "Sin unidad asignada";
                return (
                  <li key={chofer.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{chofer.fullName}</p>
                      <StatusBadge label={UNIT_STATE_LABELS[chofer.state]} tone={unitStateTone(chofer.state)} />
                    </div>
                    <p className="text-sm text-[var(--color-texto-suave)]">{unidad}</p>
                    {viaje ? (
                      <p className="text-sm">
                        {viaje.title}{" "}
                        <span className="text-[var(--color-texto-suave)]">· {viaje.detail}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-[var(--color-texto-suave)]">
                        Sin salidas en los próximos 7 días
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>

            {relevantes.length > MAX_FILAS ? (
              <Link
                href="/panel/flota?vista=choferes"
                className="text-sm font-medium text-[var(--color-acento)] hover:underline"
              >
                Ver los {relevantes.length} choferes
              </Link>
            ) : null}
          </>
        )}
      </div>
    </SectionCard>
  );
}
