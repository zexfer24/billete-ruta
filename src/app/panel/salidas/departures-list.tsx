import Link from "next/link";
import { listAgencyDepartures, listRoutes } from "@/modules/catalog";
import type { AgencyDepartureRow } from "@/modules/catalog";
import { listDrivers, listVehicles } from "@/modules/agencies";
import { formatCaracasTime24, formatRelativeDeparture, minutesUntil } from "@/lib/time";
import { departureStatusLabel, departureStatusTone } from "@/lib/labels";
import { SidePanel } from "@/components/side-panel";
import { IconBus, IconCalendar } from "@/components/icons";
import {
  EmptyState,
  MobileCard,
  PANEL_TD_CLASS,
  PANEL_TH_CLASS,
  ProgressBar,
  StatusBadge,
  TableShell,
  panelButtonClass,
} from "@/components/panel-ui";
import type { ProgressTone } from "@/components/ui-classes";
import { cx } from "@/components/ui-classes";
import { DepartureForm } from "../_forms/departure-form";
import { groupByCaracasDay, plural } from "../_shared/day-label";

const HORA_MS = 3_600_000;

/** Ocupación de una salida en palabras y con el tono de la barra: nunca solo el color. */
function ocupacion(s: AgencyDepartureRow): { label: string; detail: string; tone: ProgressTone } {
  const label = `${s.occupied} de ${plural(s.capacity, "puesto", "puestos")}`;
  if (s.capacity > 0 && s.occupied >= s.capacity) return { label, detail: "Llena", tone: "peligro" };
  if (s.capacity > 0 && s.occupied / s.capacity >= 0.9) return { label, detail: "Casi llena", tone: "alerta" };
  return { label, detail: plural(s.available, "libre", "libres"), tone: "marca" };
}

/** "Sale en 15 min" o "Sale ahora", solo si falta menos de una hora y la salida no ha partido. */
function avisoCercano(s: AgencyDepartureRow, ahora: Date): string | null {
  if (s.status !== "PROGRAMADA" && s.status !== "MANIFIESTO_CERRADO") return null;
  const minutos = minutesUntil(s.departsAt, ahora);
  if (minutos < 0 || minutos >= 60) return null;
  return formatRelativeDeparture(s.departsAt, ahora);
}

/**
 * Lista de salidas de la agencia agrupada por día ("Hoy", "Mañana",
 * "Jueves 02/10"): tabla en escritorio y tarjetas en el teléfono, con la
 * ocupación en una barra con texto y el estado en una pastilla.
 */
export async function DeparturesList({
  agencyId,
  historial,
  crearHref,
}: {
  agencyId: string;
  historial: boolean;
  crearHref: string;
}) {
  const ahora = new Date();
  // Por defecto se muestra lo que viene, más las últimas 2 horas para terminar
  // el embarque de lo que está saliendo; el historial queda en su pestaña.
  const salidas = await listAgencyDepartures(
    agencyId,
    historial
      ? { from: new Date(ahora.getTime() - 30 * 24 * HORA_MS), to: ahora, order: "desc" }
      : { from: new Date(ahora.getTime() - 2 * HORA_MS) },
  );

  if (salidas.length === 0) {
    return historial ? (
      <EmptyState
        icon={<IconCalendar />}
        title="No hubo viajes en los últimos 30 días"
        description="Aquí aparecen las salidas que ya partieron o se cancelaron."
        action={
          <Link href="/panel/salidas" className={panelButtonClass("secundario")}>
            Ver las próximas salidas
          </Link>
        }
      />
    ) : (
      <EmptyState
        icon={<IconBus />}
        title="No hay salidas programadas"
        description="Crea una salida para que los pasajeros puedan comprar pasajes en esa ruta."
        action={
          <Link href={crearHref} scroll={false} className={panelButtonClass("secundario")}>
            Crear una salida
          </Link>
        }
      />
    );
  }

  const grupos = groupByCaracasDay(salidas, (s) => s.departsAt, ahora);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-tinta-suave">
        {historial
          ? `${plural(salidas.length, "viaje", "viajes")} de los últimos 30 días, del más reciente al más antiguo.`
          : `${plural(salidas.length, "salida", "salidas")}. También se muestran las de las últimas 2 horas, para que termines su embarque.`}
      </p>

      {grupos.map((grupo) => {
        const headingId = `salidas-${grupo.key}`;
        return (
          <section key={grupo.key} aria-labelledby={headingId} className="flex flex-col gap-3">
            <h2 id={headingId} className="flex items-baseline gap-2 text-lg font-semibold text-tinta">
              {grupo.heading}
              <span className="text-sm font-normal text-tinta-suave">
                {plural(grupo.items.length, "salida", "salidas")}
              </span>
            </h2>
            <TableShell
              mobile={
                <ul className="flex flex-col gap-3">
                  {grupo.items.map((s) => {
                    const hora = formatCaracasTime24(s.departsAt);
                    const puestos = ocupacion(s);
                    const cercano = avisoCercano(s, ahora);
                    return (
                      <MobileCard
                        key={s.id}
                        title={
                          <>
                            <span className="tabular">{hora}</span> · {s.routeName}
                          </>
                        }
                        subtitle={
                          <>
                            {cercano ? <span className="font-semibold text-alerta">{cercano} · </span> : null}
                            {s.origin} → {s.destination}
                          </>
                        }
                        status={<StatusBadge label={departureStatusLabel(s.status)} tone={departureStatusTone(s.status)} />}
                        details={[
                          { label: "Vehículo", value: s.vehiclePlate },
                          { label: "Chofer", value: s.driverName },
                        ]}
                        action={
                          <div className="flex w-full flex-col gap-3">
                            <ProgressBar
                              value={s.occupied}
                              max={s.capacity}
                              label={puestos.label}
                              detail={puestos.detail}
                              tone={puestos.tone}
                            />
                            <Link href={`/panel/salidas/${s.id}`} className={panelButtonClass("secundario", "md", "w-full")}>
                              Ver detalle
                            </Link>
                          </div>
                        }
                      />
                    );
                  })}
                </ul>
              }
            >
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-borde bg-lienzo">
                  <tr>
                    <th scope="col" className={cx(PANEL_TH_CLASS, "w-28")}>Hora</th>
                    <th scope="col" className={PANEL_TH_CLASS}>Ruta</th>
                    <th scope="col" className={PANEL_TH_CLASS}>Vehículo y chofer</th>
                    <th scope="col" className={cx(PANEL_TH_CLASS, "w-52")}>Puestos</th>
                    <th scope="col" className={PANEL_TH_CLASS}>Estado</th>
                    <th scope="col" className={PANEL_TH_CLASS}>
                      <span className="sr-only">Acción</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.items.map((s) => {
                    const hora = formatCaracasTime24(s.departsAt);
                    const puestos = ocupacion(s);
                    const cercano = avisoCercano(s, ahora);
                    return (
                      <tr key={s.id} className="border-b border-borde last:border-0">
                        <td className={PANEL_TD_CLASS}>
                          <p className="tabular text-lg font-bold">{hora}</p>
                          {cercano ? <p className="text-sm font-semibold text-alerta">{cercano}</p> : null}
                        </td>
                        <td className={PANEL_TD_CLASS}>
                          <p className="font-semibold">{s.routeName}</p>
                          <p className="text-sm text-tinta-suave">
                            {s.origin} → {s.destination}
                          </p>
                        </td>
                        <td className={PANEL_TD_CLASS}>
                          <p className="tabular font-semibold">{s.vehiclePlate}</p>
                          <p className="text-sm text-tinta-suave">{s.driverName}</p>
                        </td>
                        <td className={PANEL_TD_CLASS}>
                          <ProgressBar
                            value={s.occupied}
                            max={s.capacity}
                            label={puestos.label}
                            detail={puestos.detail}
                            tone={puestos.tone}
                          />
                        </td>
                        <td className={PANEL_TD_CLASS}>
                          <StatusBadge label={departureStatusLabel(s.status)} tone={departureStatusTone(s.status)} />
                        </td>
                        <td className={cx(PANEL_TD_CLASS, "text-right")}>
                          <Link href={`/panel/salidas/${s.id}`} className={panelButtonClass("secundario", "sm")}>
                            Ver detalle
                            <span className="sr-only">
                              {" "}
                              de {s.routeName}, {grupo.heading.toLowerCase()} a las {hora}
                            </span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableShell>
          </section>
        );
      })}
    </div>
  );
}

/**
 * Panel lateral para crear una salida. Las rutas, los vehículos y los
 * choferes solo se consultan cuando el panel está abierto.
 */
export async function CreateDeparturePanel({
  agencyId,
  closeHref,
  error,
  errorField,
}: {
  agencyId: string;
  closeHref: string;
  error?: string;
  errorField?: string;
}) {
  const [rutas, vehiculos, choferes] = await Promise.all([
    listRoutes(agencyId),
    listVehicles(agencyId),
    listDrivers(agencyId),
  ]);

  return (
    <SidePanel
      title="Crear salida"
      subtitle="Elige la ruta, el vehículo, el chofer y cuándo sale."
      closeHref={closeHref}
    >
      <DepartureForm
        routes={rutas}
        vehicles={vehiculos.filter((v) => v.active)}
        drivers={choferes.filter((c) => c.active)}
        error={error}
        errorField={errorField}
      />
    </SidePanel>
  );
}
