import Link from "next/link";
import { z } from "zod";
import { requireAgencyUser } from "@/modules/auth";
import { listDrivers, listVehicles } from "@/modules/agencies";
import { agencyFleetStatus } from "@/modules/reports";
import type { UnitDeparture } from "@/modules/reports";
import { UNIT_STATE_LABELS, unitStateTone, type UnitState } from "@/lib/labels";
import { formatCaracas, formatCaracasTime24 } from "@/lib/time";
import { SidePanel } from "@/components/side-panel";
import { ClickableRow } from "@/components/clickable-row";
import { PanelFeedback } from "@/components/panel-feedback";
import { IconPlus } from "@/components/icons";
import {
  EmptyState,
  PanelPageHeader,
  PanelTabs,
  StatusBadge,
  TableShell,
  panelButtonClass,
} from "@/components/panel-ui";
import { VehicleForm } from "../_forms/vehicle-form";
import { DriverForm } from "../_forms/driver-form";

/** Traduce el código corto de `?ok=` a un texto. Un código desconocido no muestra nada. */
const OK_LABELS: Record<string, string> = {
  "vehiculo-creado": "Vehículo registrado con éxito.",
  "vehiculo-actualizado": "Vehículo actualizado con éxito.",
  "chofer-creado": "Chofer registrado con éxito.",
  "chofer-actualizado": "Chofer actualizado con éxito.",
};

/** Orden fijo del resumen de estados de vehículos. */
const ORDEN_RESUMEN: readonly UnitState[] = [
  "EN_RUTA",
  "EMBARCANDO",
  "ASIGNADO",
  "DISPONIBLE",
  "FUERA_DE_SERVICIO",
];

/**
 * Celda de "viaje en curso o próxima salida", compartida por la tabla de
 * vehículos y la de choferes para no duplicar la lógica entre pestañas.
 */
function TripCell({ current, upcoming }: { current: UnitDeparture | null; upcoming: UnitDeparture[] }) {
  if (current?.status === "EN_RUTA") {
    return (
      <div>
        <p>{current.routeName}</p>
        <p className="text-xs text-[var(--color-texto-suave)]">
          Salió {formatCaracasTime24(current.departedAt ?? current.departsAt)}
          {current.estimatedArrivalAt
            ? ` · llegada estimada ${formatCaracasTime24(current.estimatedArrivalAt)}`
            : ""}
        </p>
      </div>
    );
  }

  if (current?.status === "MANIFIESTO_CERRADO") {
    return (
      <div>
        <p>{current.routeName}</p>
        <p className="text-xs text-[var(--color-texto-suave)]">
          Embarcando · sale {formatCaracasTime24(current.departsAt)}
        </p>
      </div>
    );
  }

  const proxima = upcoming[0];
  if (proxima) {
    const restantes = upcoming.length - 1;
    return (
      <div>
        <p>{proxima.routeName}</p>
        <p className="text-xs text-[var(--color-texto-suave)]">
          {formatCaracas(proxima.departsAt, "dd/MM HH:mm")}
          {restantes > 0 ? ` · +${restantes} más` : ""}
        </p>
      </div>
    );
  }

  return <span className="text-[var(--color-texto-suave)]">—</span>;
}

export default async function FlotaPage({
  searchParams,
}: {
  searchParams: Promise<{
    vista?: string;
    registrar?: string;
    editar?: string;
    ok?: string;
    error?: string;
  }>;
}) {
  const { agencyId } = await requireAgencyUser("fleet.manage");
  const params = await searchParams;

  const vista = params.vista === "choferes" ? "choferes" : "vehiculos";
  const registrar =
    params.registrar === "vehiculo" || params.registrar === "chofer" ? params.registrar : undefined;
  const editarParsed = z.string().uuid().safeParse(params.editar);
  const editarId = editarParsed.success ? editarParsed.data : undefined;

  const [fleet, vehiculosEditables, choferesEditables] = await Promise.all([
    agencyFleetStatus(agencyId),
    editarId && vista === "vehiculos" ? listVehicles(agencyId) : Promise.resolve(null),
    editarId && vista === "choferes" ? listDrivers(agencyId) : Promise.resolve(null),
  ]);

  const vehiculoEnEdicion = vehiculosEditables?.find((v) => v.id === editarId);
  const choferEnEdicion = choferesEditables?.find((c) => c.id === editarId);

  const panelAbierto = Boolean(registrar) || Boolean(vehiculoEnEdicion) || Boolean(choferEnEdicion);
  const closeHref = `/panel/flota?vista=${vista}`;

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader
        title="Vehículos y choferes"
        description="Estado operativo de tus unidades y choferes. Horas en formato de 24 horas, hora de Caracas."
        actions={
          vista === "vehiculos" ? (
            <Link
              href="/panel/flota?vista=vehiculos&registrar=vehiculo"
              scroll={false}
              className={panelButtonClass("primario")}
            >
              <IconPlus className="h-4 w-4" />
              Registrar vehículo
            </Link>
          ) : (
            <Link
              href="/panel/flota?vista=choferes&registrar=chofer"
              scroll={false}
              className={panelButtonClass("primario")}
            >
              <IconPlus className="h-4 w-4" />
              Registrar chofer
            </Link>
          )
        }
      />

      <PanelFeedback
        error={panelAbierto ? undefined : params.error}
        ok={params.ok ? OK_LABELS[params.ok] : undefined}
      />

      <PanelTabs
        label="Secciones de flota"
        tabs={[
          {
            href: "/panel/flota?vista=vehiculos",
            label: "Vehículos",
            count: fleet.vehicles.length,
            active: vista === "vehiculos",
          },
          {
            href: "/panel/flota?vista=choferes",
            label: "Choferes",
            count: fleet.drivers.length,
            active: vista === "choferes",
          },
        ]}
      />

      {vista === "vehiculos" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {ORDEN_RESUMEN.filter((estado) => fleet.vehicleSummary[estado] > 0).map((estado) => (
              <StatusBadge
                key={estado}
                label={`${UNIT_STATE_LABELS[estado]} · ${fleet.vehicleSummary[estado]}`}
                tone={unitStateTone(estado)}
              />
            ))}
          </div>

          {fleet.vehicles.length === 0 ? (
            <EmptyState
              title="Todavía no hay vehículos registrados."
              action={
                <Link
                  href="/panel/flota?vista=vehiculos&registrar=vehiculo"
                  scroll={false}
                  className={panelButtonClass("primario")}
                >
                  Registrar vehículo
                </Link>
              }
            />
          ) : (
            <TableShell>
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-[var(--color-borde)] text-[var(--color-texto-suave)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Placa</th>
                    <th className="px-4 py-3 font-medium">Marca y modelo</th>
                    <th className="px-4 py-3 font-medium">Asientos</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Viaje en curso o próxima salida</th>
                    <th className="px-4 py-3 font-medium">Editar</th>
                  </tr>
                </thead>
                <tbody>
                  {fleet.vehicles.map((vehiculo) => {
                    const href = `/panel/flota?vista=vehiculos&editar=${vehiculo.id}`;
                    return (
                      <ClickableRow
                        key={vehiculo.id}
                        href={href}
                        selected={vehiculo.id === vehiculoEnEdicion?.id}
                        className="border-b border-[var(--color-borde)] last:border-0"
                      >
                        <td className="tabular px-4 py-3">{vehiculo.plate}</td>
                        <td className="px-4 py-3">
                          {vehiculo.brand} {vehiculo.model}
                        </td>
                        <td className="tabular px-4 py-3">{vehiculo.seatCount}</td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            label={UNIT_STATE_LABELS[vehiculo.state]}
                            tone={unitStateTone(vehiculo.state)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <TripCell current={vehiculo.current} upcoming={vehiculo.upcoming} />
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={href}
                            scroll={false}
                            className="rounded-md border border-[var(--color-borde)] px-3 py-1.5 text-sm font-medium transition-colors duration-150 hover:bg-[var(--color-acento-suave)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-acento)] motion-reduce:transition-none"
                          >
                            Editar
                          </Link>
                        </td>
                      </ClickableRow>
                    );
                  })}
                </tbody>
              </table>
            </TableShell>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {fleet.drivers.length === 0 ? (
            <EmptyState
              title="Todavía no hay choferes registrados."
              action={
                <Link
                  href="/panel/flota?vista=choferes&registrar=chofer"
                  scroll={false}
                  className={panelButtonClass("primario")}
                >
                  Registrar chofer
                </Link>
              }
            />
          ) : (
            <TableShell>
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-[var(--color-borde)] text-[var(--color-texto-suave)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">C.I.</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Viaje en curso o próxima salida</th>
                    <th className="px-4 py-3 font-medium">Embarques</th>
                    <th className="px-4 py-3 font-medium">Desembarques</th>
                    <th className="px-4 py-3 font-medium">Editar</th>
                  </tr>
                </thead>
                <tbody>
                  {fleet.drivers.map((chofer) => {
                    const href = `/panel/flota?vista=choferes&editar=${chofer.id}`;
                    return (
                      <ClickableRow
                        key={chofer.id}
                        href={href}
                        selected={chofer.id === choferEnEdicion?.id}
                        className="border-b border-[var(--color-borde)] last:border-0"
                      >
                        <td className="px-4 py-3">{chofer.fullName}</td>
                        {/* La C.I. va completa: el chofer es personal de la propia agencia. */}
                        <td className="tabular px-4 py-3">{chofer.idNumber}</td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            label={UNIT_STATE_LABELS[chofer.state]}
                            tone={unitStateTone(chofer.state)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <TripCell current={chofer.current} upcoming={chofer.upcoming} />
                        </td>
                        <td className="tabular px-4 py-3">{chofer.boardingCount}</td>
                        <td className="tabular px-4 py-3">{chofer.arrivalCount}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={href}
                            scroll={false}
                            className="rounded-md border border-[var(--color-borde)] px-3 py-1.5 text-sm font-medium transition-colors duration-150 hover:bg-[var(--color-acento-suave)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-acento)] motion-reduce:transition-none"
                          >
                            Editar
                          </Link>
                        </td>
                      </ClickableRow>
                    );
                  })}
                </tbody>
              </table>
            </TableShell>
          )}
        </div>
      )}

      {registrar === "vehiculo" ? (
        <SidePanel title="Registrar vehículo" closeHref={closeHref}>
          <VehicleForm mode="create" error={params.error} />
        </SidePanel>
      ) : null}

      {registrar === "chofer" ? (
        <SidePanel title="Registrar chofer" closeHref={closeHref}>
          <DriverForm mode="create" error={params.error} />
        </SidePanel>
      ) : null}

      {!registrar && vehiculoEnEdicion ? (
        <SidePanel title={`Editar vehículo ${vehiculoEnEdicion.plate}`} closeHref={closeHref}>
          <VehicleForm mode="edit" vehicle={vehiculoEnEdicion} error={params.error} />
        </SidePanel>
      ) : null}

      {!registrar && choferEnEdicion ? (
        <SidePanel
          title={`Editar chofer ${choferEnEdicion.fullName}`}
          subtitle={`C.I. ${choferEnEdicion.idNumber}`}
          closeHref={closeHref}
        >
          <DriverForm mode="edit" driver={choferEnEdicion} error={params.error} />
        </SidePanel>
      ) : null}
    </div>
  );
}
