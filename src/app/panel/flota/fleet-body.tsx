import { cache } from "react";
import Link from "next/link";
import { listDrivers } from "@/modules/agencies";
import { agencyFleetStatus } from "@/modules/reports";
import type { DriverStatusRow, UnitDeparture, VehicleStatusRow } from "@/modules/reports";
import { UNIT_STATE_LABELS, unitStateTone, type UnitState } from "@/lib/labels";
import { Alert } from "@/components/alert";
import { ClickableRow } from "@/components/clickable-row";
import { PanelFeedback } from "@/components/panel-feedback";
import { SidePanel } from "@/components/side-panel";
import { IconBus, IconChevronRight, IconUser, IconWarning } from "@/components/icons";
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
import { noticeTextNoBreak } from "../_shared/departure-notice";
import { activeTripDepartureId, describeUnitTrip } from "../_shared/unit-trip";

export type FleetView = "vehiculos" | "choferes";

/** Traduce el código corto de `?ok=` a un texto. Un código desconocido no muestra nada. */
const OK_LABELS: Readonly<Record<string, string>> = {
  "vehiculo-creado": "Vehículo registrado. Ya puedes asignarlo a una salida.",
  "vehiculo-actualizado": "Cambios del vehículo guardados.",
  "chofer-creado": "Chofer registrado. Ya puedes asignarlo a una salida.",
  "chofer-actualizado": "Cambios del chofer guardados.",
};

/** Orden fijo del resumen de estados, el mismo que el del tablero. */
const ORDEN_RESUMEN: readonly UnitState[] = [
  "EN_RUTA",
  "ATRASADO",
  "EMBARCANDO",
  "ASIGNADO",
  "DISPONIBLE",
  "FUERA_DE_SERVICIO",
];

/**
 * Estado de la flota de la agencia, una sola consulta por petición: la lista
 * (en su `<Suspense key={vista}>`) y el panel de edición (en el suyo) la
 * comparten con `cache` en vez de pedirla dos veces. Trae su propio `now`
 * para que las dos zonas describan los viajes con la misma hora.
 */
const fleetStatusFor = cache(async (agencyId: string) => {
  const now = new Date();
  return { fleet: await agencyFleetStatus(agencyId, now), now };
});

/**
 * Viaje en curso o próxima salida de una unidad, compartido por las tablas y
 * las tarjetas de vehículos y choferes. Recibe la fila completa, que trae el
 * total de próximas salidas (`upcomingCount`): la cifra "N salidas más" es
 * exacta aunque `upcoming` venga recortada a 3.
 */
function TripSummary({
  unit,
  now,
}: {
  unit: { current: UnitDeparture | null; upcoming: UnitDeparture[]; upcomingCount: number };
  now: Date;
}) {
  const viaje = describeUnitTrip(unit, now);
  if (!viaje) return <span className="text-tinta-suave">Sin salidas en los próximos 7 días</span>;
  // Un viaje en ruta, embarcando o atrasado se resuelve en su hoja: la ruta
  // enlaza a ella (la fila sigue abriendo la edición de la unidad).
  const salidaId = activeTripDepartureId(unit);
  return (
    <span className="flex flex-col">
      {salidaId ? (
        // 44 px de área táctil (spec 1.10) sin agrandar el renglón: el
        // margen negativo devuelve el alto que agrega `min-h-11`.
        <Link
          href={`/panel/salidas/${salidaId}`}
          className="foco -my-2.5 inline-flex min-h-11 w-fit items-center rounded-control font-semibold text-marca-700 underline underline-offset-2 hover:text-marca-800"
        >
          {viaje.title}
          <span className="sr-only"> (abrir la salida)</span>
        </Link>
      ) : (
        <span className="font-semibold text-tinta">{viaje.title}</span>
      )}
      {viaje.late ? (
        // Atrasada: mismo aviso, icono y tono que la lista de salidas y el tablero.
        <span className="tabular flex items-start gap-1.5 text-sm font-semibold text-alerta">
          <IconWarning className="mt-0.5 size-4 shrink-0" />
          <span>{noticeTextNoBreak(viaje.detail)}</span>
        </span>
      ) : (
        <span className="tabular text-sm text-tinta-suave">{viaje.detail}</span>
      )}
    </span>
  );
}

/**
 * Viaje de una unidad en la tarjeta del teléfono: a todo el ancho, porque en
 * media columna la ruta y el aviso se partían en cuatro renglones. Debajo va
 * el enlace de texto "Editar ›", igual que "Ver detalle ›" en las tarjetas de
 * Salidas: siete botones de contorno a todo el ancho pesaban más que los datos.
 * La tarjeta no es un enlace entero porque la ruta de un viaje activo ya
 * enlaza a su hoja.
 */
function MobileTripAndAction({
  unit,
  now,
  editHref,
  editLabel,
}: {
  unit: { current: UnitDeparture | null; upcoming: UnitDeparture[]; upcomingCount: number };
  now: Date;
  editHref: string;
  /** Texto para el lector de pantalla: a quién edita el enlace. */
  editLabel: string;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="tabular text-[15px] text-tinta">
        <TripSummary unit={unit} now={now} />
      </div>
      <Link
        href={editHref}
        scroll={false}
        className="foco -mx-1 inline-flex min-h-11 w-fit items-center gap-1 rounded-control px-1 text-[15px] font-semibold text-marca-700 hover:text-marca-800"
      >
        Editar
        <span className="sr-only"> {editLabel}</span>
        <IconChevronRight className="size-4 shrink-0" />
      </Link>
    </div>
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
  const counts: Record<UnitState, number> = {
    EN_RUTA: 0,
    ATRASADO: 0,
    EMBARCANDO: 0,
    ASIGNADO: 0,
    DISPONIBLE: 0,
    FUERA_DE_SERVICIO: 0,
  };
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
              subtitle={
                <>
                  {v.brand} {v.model} · <span className="tabular whitespace-nowrap">{v.seatCount} puestos</span>
                </>
              }
              status={<StatusBadge label={UNIT_STATE_LABELS[v.state]} tone={unitStateTone(v.state)} />}
              action={
                <MobileTripAndAction
                  unit={v}
                  now={now}
                  editHref={`/panel/flota?vista=vehiculos&editar=${v.id}`}
                  editLabel={`el vehículo ${v.plate}`}
                />
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
                  {/* Marca y modelo en una línea: a 820 px no se parte "O500 / RS". */}
                  <p className="whitespace-nowrap text-sm text-tinta-suave">
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
              subtitle={
                <>
                  <span className="tabular whitespace-nowrap">Cédula {c.idNumber}</span> ·{" "}
                  <span className="tabular whitespace-nowrap">
                    {c.arrivalCount === 1 ? "1 viaje completado" : `${c.arrivalCount} viajes completados`}
                  </span>
                </>
              }
              status={<StatusBadge label={UNIT_STATE_LABELS[c.state]} tone={unitStateTone(c.state)} />}
              action={
                <MobileTripAndAction
                  unit={c}
                  now={now}
                  editHref={`/panel/flota?vista=choferes&editar=${c.id}`}
                  editLabel={`a ${c.fullName}`}
                />
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
                  {/* En un renglón: a 820 px "María Gabriela / Colmenares" se partía. */}
                  <p className="whitespace-nowrap font-semibold">{c.fullName}</p>
                  {/* La cédula va completa: el chofer es personal de la propia agencia. */}
                  <p className="tabular whitespace-nowrap text-sm text-tinta-suave">Cédula {c.idNumber}</p>
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
 * Cuerpo de la pantalla de flota: aviso de resultado, pestañas con contador,
 * resumen por estado y la lista de la pestaña activa. Se consulta dentro de un
 * `<Suspense key={vista}>` para que la cabecera salga al instante. Los paneles
 * laterales van aparte (`FleetRegisterPanel` y `FleetEditPanel`), fuera de
 * este `<Suspense>`: abrir uno no cambia la `vista`, y si vivieran aquí la
 * pantalla quedaría quieta, sin panel ni silueta, hasta que volviera toda la
 * flota (spec 6.5).
 */
export async function FleetBody({
  agencyId,
  vista,
  selectedId,
  panelAbierto,
  error,
  ok,
}: {
  agencyId: string;
  vista: FleetView;
  /** Unidad en edición, para marcar su fila. */
  selectedId?: string;
  /** Con un panel abierto, el error de `?error=` se muestra dentro del formulario. */
  panelAbierto: boolean;
  error?: string;
  ok?: string;
}) {
  const { fleet, now } = await fleetStatusFor(agencyId);

  return (
    <div className="flex flex-col gap-6">
      <PanelFeedback error={panelAbierto ? undefined : error} ok={okMessage(OK_LABELS, ok)} />

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
          <VehiclesList vehicles={fleet.vehicles} selectedId={selectedId} now={now} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <StateSummary counts={countStates(fleet.drivers)} label="Choferes por estado:" />
          <DriversList drivers={fleet.drivers} selectedId={selectedId} now={now} />
        </div>
      )}
    </div>
  );
}

/**
 * Panel lateral de registro de un vehículo o un chofer. No consulta nada: se
 * pinta en la misma respuesta que la página, sin esperar a la flota.
 */
export function FleetRegisterPanel({
  registrar,
  closeHref,
  error,
  errorField,
}: {
  registrar: "vehiculo" | "chofer";
  closeHref: string;
  error?: string;
  errorField?: string;
}) {
  return registrar === "vehiculo" ? (
    <SidePanel title="Registrar vehículo" subtitle="Los datos del bus que vas a asignar a las salidas." closeHref={closeHref}>
      <VehicleForm mode="create" error={error} errorField={errorField} />
    </SidePanel>
  ) : (
    <SidePanel title="Registrar chofer" subtitle="Los datos de la persona que maneja el bus." closeHref={closeHref}>
      <DriverForm mode="create" error={error} errorField={errorField} />
    </SidePanel>
  );
}

/**
 * Panel lateral de edición de la unidad de `?editar=`, en su propio
 * `<Suspense key>`: al pulsar "Editar" o una fila aparece al instante la
 * silueta del panel y luego el formulario. Usa la misma consulta de flota que
 * la lista (`fleetStatusFor`) y, para un chofer, su teléfono de `listDrivers`.
 * Si el id no es de nadie de la agencia, lo explica en vez del panel.
 */
export async function FleetEditPanel({
  agencyId,
  vista,
  editar,
  closeHref,
  error,
  errorField,
}: {
  agencyId: string;
  vista: FleetView;
  /** Valor crudo de `?editar=`; si no corresponde a nadie se explica en pantalla. */
  editar: string;
  closeHref: string;
  error?: string;
  errorField?: string;
}) {
  const esChofer = vista === "choferes";
  const [{ fleet }, choferes] = await Promise.all([
    fleetStatusFor(agencyId),
    // El teléfono del chofer solo lo trae el listado de choferes, y solo hace falta al editar.
    esChofer ? listDrivers(agencyId) : Promise.resolve(null),
  ]);

  if (!esChofer) {
    const vehiculo = fleet.vehicles.find((v) => v.id === editar);
    if (vehiculo) {
      return (
        <SidePanel
          title="Editar vehículo"
          subtitle={`${vehiculo.plate} · ${vehiculo.brand} ${vehiculo.model}`}
          closeHref={closeHref}
        >
          <VehicleForm
            mode="edit"
            vehicle={vehiculo}
            upcomingCount={vehiculo.upcomingCount}
            error={error}
            errorField={errorField}
          />
        </SidePanel>
      );
    }
  } else {
    const chofer = choferes?.find((c) => c.id === editar);
    if (chofer) {
      const estado = fleet.drivers.find((c) => c.id === editar);
      return (
        <SidePanel title="Editar chofer" subtitle={chofer.fullName} closeHref={closeHref}>
          <DriverForm
            mode="edit"
            driver={chofer}
            upcomingCount={estado?.upcomingCount ?? 0}
            error={error}
            errorField={errorField}
          />
        </SidePanel>
      );
    }
  }

  return (
    <Alert tone="alerta" title={esChofer ? "No encontramos ese chofer" : "No encontramos ese vehículo"}>
      Puede que el enlace esté incompleto. Elígelo de la lista para editarlo.
    </Alert>
  );
}
