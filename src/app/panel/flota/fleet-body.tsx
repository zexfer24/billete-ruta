import Link from "next/link";
import { listDrivers } from "@/modules/agencies";
import { agencyFleetStatus } from "@/modules/reports";
import type { DriverStatusRow, UnitDeparture, VehicleStatusRow } from "@/modules/reports";
import { UNIT_STATE_LABELS, unitStateTone, type UnitState } from "@/lib/labels";
import { Alert } from "@/components/alert";
import { ClickableRow } from "@/components/clickable-row";
import { PanelFeedback } from "@/components/panel-feedback";
import { SidePanel } from "@/components/side-panel";
import { IconBus, IconUser } from "@/components/icons";
import {
  EmptyState,
  MobileCard,
  PANEL_TD_CLASS,
  PANEL_TH_CLASS,
  PanelTabs,
  StatusBadge,
  TableShell,
  panelButtonClass,
} from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import { okMessage } from "../_dashboard/search-params";
import { DriverForm } from "../_forms/driver-form";
import { VehicleForm } from "../_forms/vehicle-form";
import { describeUnitTrip } from "../_shared/unit-trip";

export type FleetView = "vehiculos" | "choferes";

/** Traduce el código corto de `?ok=` a un texto. Un código desconocido no muestra nada. */
const OK_LABELS: Readonly<Record<string, string>> = {
  "vehiculo-creado": "Vehículo registrado. Ya puedes asignarlo a una salida.",
  "vehiculo-actualizado": "Cambios del vehículo guardados.",
  "chofer-creado": "Chofer registrado. Ya puedes asignarlo a una salida.",
  "chofer-actualizado": "Cambios del chofer guardados.",
};

/** Orden fijo del resumen de estados. */
const ORDEN_RESUMEN: readonly UnitState[] = ["EN_RUTA", "EMBARCANDO", "ASIGNADO", "DISPONIBLE", "FUERA_DE_SERVICIO"];

/**
 * Viaje en curso o próxima salida de una unidad, compartido por las tablas y
 * las tarjetas de vehículos y choferes. Recibe la fila completa: si trae el
 * total de próximas salidas (`upcomingCount`), la cifra "N salidas más" es
 * exacta aunque `upcoming` venga recortada.
 */
function TripSummary({
  unit,
  now,
}: {
  unit: { current: UnitDeparture | null; upcoming: UnitDeparture[]; upcomingCount?: number };
  now: Date;
}) {
  const viaje = describeUnitTrip(unit, now);
  if (!viaje) return <span className="text-tinta-suave">Sin salidas en los próximos 7 días</span>;
  return (
    <span className="flex flex-col">
      <span className="font-semibold text-tinta">{viaje.title}</span>
      <span className="tabular text-sm text-tinta-suave">{viaje.detail}</span>
    </span>
  );
}

/**
 * Pastillas con cuántas unidades hay en cada estado (solo los que tienen
 * alguna). Si todas están en el mismo estado no se muestra: repetiría el
 * contador de la pestaña y la pastilla de cada fila.
 */
function StateSummary({ counts, label }: { counts: Record<UnitState, number>; label: string }) {
  const estados = ORDEN_RESUMEN.filter((estado) => counts[estado] > 0);
  if (estados.length < 2) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-sm font-semibold text-tinta-suave">{label}</p>
      <ul className="flex flex-wrap gap-2">
        {estados.map((estado) => (
          <li key={estado}>
            <StatusBadge label={`${UNIT_STATE_LABELS[estado]}: ${counts[estado]}`} tone={unitStateTone(estado)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function countStates(rows: ReadonlyArray<{ state: UnitState }>): Record<UnitState, number> {
  const counts: Record<UnitState, number> = { EN_RUTA: 0, EMBARCANDO: 0, ASIGNADO: 0, DISPONIBLE: 0, FUERA_DE_SERVICIO: 0 };
  for (const row of rows) counts[row.state] += 1;
  return counts;
}

function VehiclesList({ vehicles, selectedId, now }: { vehicles: VehicleStatusRow[]; selectedId?: string; now: Date }) {
  if (vehicles.length === 0) {
    return (
      <EmptyState
        icon={<IconBus />}
        title="Todavía no hay vehículos registrados"
        description="Registra los buses de tu agencia para poder asignarlos a las salidas."
        action={
          <Link href="/panel/flota?vista=vehiculos&registrar=vehiculo" scroll={false} className={panelButtonClass("secundario")}>
            Registrar vehículo
          </Link>
        }
      />
    );
  }

  return (
    <TableShell
      mobile={
        <ul className="flex flex-col gap-3">
          {vehicles.map((v) => (
            <MobileCard
              key={v.id}
              title={<span className="tabular">{v.plate}</span>}
              subtitle={`${v.brand} ${v.model}`}
              status={<StatusBadge label={UNIT_STATE_LABELS[v.state]} tone={unitStateTone(v.state)} />}
              details={[
                { label: "Puestos", value: v.seatCount },
                { label: "Viaje", value: <TripSummary unit={v} now={now} /> },
              ]}
              action={
                <Link
                  href={`/panel/flota?vista=vehiculos&editar=${v.id}`}
                  scroll={false}
                  className={panelButtonClass("secundario", "md", "w-full")}
                >
                  Editar vehículo
                </Link>
              }
            />
          ))}
        </ul>
      }
    >
      <table className="w-full min-w-[720px]">
        <thead className="border-b border-borde bg-lienzo">
          <tr>
            <th scope="col" className={PANEL_TH_CLASS}>Vehículo</th>
            <th scope="col" className={PANEL_TH_CLASS}>Puestos</th>
            <th scope="col" className={PANEL_TH_CLASS}>Estado</th>
            <th scope="col" className={PANEL_TH_CLASS}>Viaje en curso o próximo</th>
            <th scope="col" className={PANEL_TH_CLASS}>
              <span className="sr-only">Acción</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => {
            const href = `/panel/flota?vista=vehiculos&editar=${v.id}`;
            return (
              <ClickableRow
                key={v.id}
                href={href}
                selected={v.id === selectedId}
                className="border-b border-borde last:border-0"
              >
                <td className={PANEL_TD_CLASS}>
                  <p className="tabular text-base font-bold">{v.plate}</p>
                  <p className="text-sm text-tinta-suave">
                    {v.brand} {v.model}
                  </p>
                </td>
                <td className={cx(PANEL_TD_CLASS, "tabular")}>{v.seatCount}</td>
                <td className={PANEL_TD_CLASS}>
                  <StatusBadge label={UNIT_STATE_LABELS[v.state]} tone={unitStateTone(v.state)} />
                </td>
                <td className={PANEL_TD_CLASS}>
                  <TripSummary unit={v} now={now} />
                </td>
                <td className={cx(PANEL_TD_CLASS, "text-right")}>
                  <Link href={href} scroll={false} className={panelButtonClass("secundario", "sm")}>
                    Editar<span className="sr-only"> el vehículo {v.plate}</span>
                  </Link>
                </td>
              </ClickableRow>
            );
          })}
        </tbody>
      </table>
    </TableShell>
  );
}

function DriversList({ drivers, selectedId, now }: { drivers: DriverStatusRow[]; selectedId?: string; now: Date }) {
  if (drivers.length === 0) {
    return (
      <EmptyState
        icon={<IconUser />}
        title="Todavía no hay choferes registrados"
        description="Registra a los choferes de tu agencia para poder asignarlos a las salidas."
        action={
          <Link href="/panel/flota?vista=choferes&registrar=chofer" scroll={false} className={panelButtonClass("secundario")}>
            Registrar chofer
          </Link>
        }
      />
    );
  }

  return (
    <TableShell
      mobile={
        <ul className="flex flex-col gap-3">
          {drivers.map((c) => (
            <MobileCard
              key={c.id}
              title={c.fullName}
              subtitle={<span className="tabular">Cédula {c.idNumber}</span>}
              status={<StatusBadge label={UNIT_STATE_LABELS[c.state]} tone={unitStateTone(c.state)} />}
              details={[
                { label: "Viajes completados", value: c.arrivalCount },
                { label: "Viaje", value: <TripSummary unit={c} now={now} /> },
              ]}
              action={
                <Link
                  href={`/panel/flota?vista=choferes&editar=${c.id}`}
                  scroll={false}
                  className={panelButtonClass("secundario", "md", "w-full")}
                >
                  Editar chofer
                </Link>
              }
            />
          ))}
        </ul>
      }
    >
      <table className="w-full min-w-[760px]">
        <thead className="border-b border-borde bg-lienzo">
          <tr>
            <th scope="col" className={PANEL_TH_CLASS}>Chofer</th>
            <th scope="col" className={PANEL_TH_CLASS}>Estado</th>
            <th scope="col" className={PANEL_TH_CLASS}>Viaje en curso o próximo</th>
            <th scope="col" className={PANEL_TH_CLASS}>Viajes completados</th>
            <th scope="col" className={PANEL_TH_CLASS}>
              <span className="sr-only">Acción</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((c) => {
            const href = `/panel/flota?vista=choferes&editar=${c.id}`;
            return (
              <ClickableRow
                key={c.id}
                href={href}
                selected={c.id === selectedId}
                className="border-b border-borde last:border-0"
              >
                <td className={PANEL_TD_CLASS}>
                  <p className="font-semibold">{c.fullName}</p>
                  {/* La cédula va completa: el chofer es personal de la propia agencia. */}
                  <p className="tabular text-sm text-tinta-suave">Cédula {c.idNumber}</p>
                </td>
                <td className={PANEL_TD_CLASS}>
                  <StatusBadge label={UNIT_STATE_LABELS[c.state]} tone={unitStateTone(c.state)} />
                </td>
                <td className={PANEL_TD_CLASS}>
                  <TripSummary unit={c} now={now} />
                </td>
                <td className={cx(PANEL_TD_CLASS, "tabular")}>{c.arrivalCount}</td>
                <td className={cx(PANEL_TD_CLASS, "text-right")}>
                  <Link href={href} scroll={false} className={panelButtonClass("secundario", "sm")}>
                    Editar<span className="sr-only"> a {c.fullName}</span>
                  </Link>
                </td>
              </ClickableRow>
            );
          })}
        </tbody>
      </table>
    </TableShell>
  );
}

/**
 * Cuerpo de la pantalla de flota: pestañas con contador, resumen por estado,
 * la lista de la pestaña activa y el panel lateral de registro o edición.
 * Se consulta dentro de un `<Suspense>` para que la cabecera salga al instante.
 */
export async function FleetBody({
  agencyId,
  vista,
  registrar,
  editar,
  error,
  errorField,
  ok,
}: {
  agencyId: string;
  vista: FleetView;
  registrar?: "vehiculo" | "chofer";
  /** Valor crudo de `?editar=`; si no corresponde a nadie se explica en pantalla. */
  editar?: string;
  error?: string;
  errorField?: string;
  ok?: string;
}) {
  const now = new Date();
  const editarChofer = !registrar && editar !== undefined && vista === "choferes";
  const [fleet, choferesEditables] = await Promise.all([
    agencyFleetStatus(agencyId, now),
    // El teléfono del chofer solo lo trae el listado de choferes, y solo hace falta al editar.
    editarChofer ? listDrivers(agencyId) : Promise.resolve(null),
  ]);

  const vehiculoEnEdicion =
    !registrar && editar !== undefined && vista === "vehiculos" ? fleet.vehicles.find((v) => v.id === editar) : undefined;
  const choferEstado = editarChofer ? fleet.drivers.find((c) => c.id === editar) : undefined;
  const choferEnEdicion = editarChofer ? choferesEditables?.find((c) => c.id === editar) : undefined;
  const edicionPerdida = !registrar && editar !== undefined && !vehiculoEnEdicion && !choferEnEdicion;

  const panelAbierto = Boolean(registrar) || Boolean(vehiculoEnEdicion) || Boolean(choferEnEdicion);
  const closeHref = `/panel/flota?vista=${vista}`;

  return (
    <div className="flex flex-col gap-6">
      <PanelFeedback error={panelAbierto ? undefined : error} ok={okMessage(OK_LABELS, ok)} />

      {edicionPerdida ? (
        <Alert tone="alerta" title={vista === "choferes" ? "No encontramos ese chofer" : "No encontramos ese vehículo"}>
          Puede que el enlace esté incompleto. Elígelo de la lista para editarlo.
        </Alert>
      ) : null}

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
          <StateSummary counts={fleet.vehicleSummary} label="Vehículos por estado:" />
          <VehiclesList vehicles={fleet.vehicles} selectedId={vehiculoEnEdicion?.id} now={now} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <StateSummary counts={countStates(fleet.drivers)} label="Choferes por estado:" />
          <DriversList drivers={fleet.drivers} selectedId={choferEnEdicion?.id} now={now} />
        </div>
      )}

      {registrar === "vehiculo" ? (
        <SidePanel
          title="Registrar vehículo"
          subtitle="Los datos del bus que vas a asignar a las salidas."
          closeHref={closeHref}
        >
          <VehicleForm mode="create" error={error} errorField={errorField} />
        </SidePanel>
      ) : null}

      {registrar === "chofer" ? (
        <SidePanel
          title="Registrar chofer"
          subtitle="Los datos de la persona que maneja el bus."
          closeHref={closeHref}
        >
          <DriverForm mode="create" error={error} errorField={errorField} />
        </SidePanel>
      ) : null}

      {vehiculoEnEdicion ? (
        <SidePanel
          title="Editar vehículo"
          subtitle={`${vehiculoEnEdicion.plate} · ${vehiculoEnEdicion.brand} ${vehiculoEnEdicion.model}`}
          closeHref={closeHref}
        >
          <VehicleForm
            mode="edit"
            vehicle={vehiculoEnEdicion}
            upcomingCount={vehiculoEnEdicion.upcoming.length}
            error={error}
            errorField={errorField}
          />
        </SidePanel>
      ) : null}

      {choferEnEdicion ? (
        <SidePanel title="Editar chofer" subtitle={choferEnEdicion.fullName} closeHref={closeHref}>
          <DriverForm
            mode="edit"
            driver={choferEnEdicion}
            upcomingCount={choferEstado?.upcoming.length ?? 0}
            error={error}
            errorField={errorField}
          />
        </SidePanel>
      ) : null}
    </div>
  );
}
