import Link from "next/link";
import { requireAgencyUser } from "@/modules/auth";
import { listAgencyDepartures, listRoutes } from "@/modules/catalog";
import { listDrivers, listVehicles } from "@/modules/agencies";
import { formatCaracasDateTime24 } from "@/lib/time";
import { departureStatusLabel, departureStatusTone } from "@/lib/labels";
import { PanelFeedback } from "@/components/panel-feedback";
import { SidePanel } from "@/components/side-panel";
import { IconPlus } from "@/components/icons";
import {
  EmptyState,
  PanelPageHeader,
  PanelTabs,
  StatusBadge,
  TableShell,
  panelButtonClass,
} from "@/components/panel-ui";
import { DepartureForm } from "../_forms/departure-form";

/** Traduce el código corto de `?ok=` a un texto. Un código desconocido no muestra nada. */
const OK_LABELS: Record<string, string> = {
  "salida-creada": "Salida creada con éxito.",
};

/** Porcentaje de ocupación, con tope de 100 para no desbordar la barra. */
function ocupacionPorcentaje(occupied: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.round((occupied / capacity) * 100));
}

export default async function SalidasPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string; crear?: string; error?: string; ok?: string }>;
}) {
  const { agencyId } = await requireAgencyUser("departures.manage");
  const { ver, crear, error, ok } = await searchParams;
  const historial = ver === "historial";
  const crearAbierto = crear === "1";

  const ahora = new Date();
  // Por defecto se muestra lo que viene; el historial de viajes ya cumplidos
  // queda detrás de una pestaña para que no tape la operación del día.
  const rango = historial
    ? { from: new Date(ahora.getTime() - 30 * 24 * 3_600_000), to: ahora, order: "desc" as const }
    : { from: new Date(ahora.getTime() - 2 * 3_600_000) };

  const [salidas, rutas, vehiculos, choferes] = await Promise.all([
    listAgencyDepartures(agencyId, rango),
    listRoutes(agencyId),
    listVehicles(agencyId),
    listDrivers(agencyId),
  ]);

  const verQuery = historial ? "ver=historial" : "";
  const crearHref = `/panel/salidas?${[verQuery, "crear=1"].filter(Boolean).join("&")}`;
  const closeHref = historial ? "/panel/salidas?ver=historial" : "/panel/salidas";

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader
        title="Salidas"
        description={
          historial
            ? "Viajes de los últimos 30 días, del más reciente al más antiguo."
            : `${salidas.length} salida(s) programada(s) de aquí en adelante.`
        }
        actions={
          <Link href={crearHref} scroll={false} className={panelButtonClass("primario")}>
            <IconPlus className="h-4 w-4" />
            Crear salida
          </Link>
        }
      />

      <PanelTabs
        label="Periodo de salidas"
        tabs={[
          { href: "/panel/salidas", label: "Próximas", active: !historial },
          { href: "/panel/salidas?ver=historial", label: "Historial", active: historial },
        ]}
      />

      {!crearAbierto ? <PanelFeedback error={error} ok={ok ? OK_LABELS[ok] : undefined} /> : null}

      {salidas.length === 0 ? (
        <EmptyState
          title={
            historial
              ? "No hay viajes en los últimos 30 días."
              : "No hay salidas programadas de aquí en adelante."
          }
          action={
            !historial ? (
              <Link href={crearHref} scroll={false} className={panelButtonClass("primario", "sm")}>
                Crear salida
              </Link>
            ) : undefined
          }
        />
      ) : (
        <TableShell>
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-[var(--color-borde)] text-[var(--color-texto-suave)]">
              <tr>
                <th className="px-4 py-3 font-medium">Ruta</th>
                <th className="px-4 py-3 font-medium">Fecha y hora</th>
                <th className="px-4 py-3 font-medium">Unidad</th>
                <th className="px-4 py-3 font-medium">Chofer</th>
                <th className="px-4 py-3 font-medium">Ocupación</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {salidas.map((s) => {
                const pct = ocupacionPorcentaje(s.occupied, s.capacity);
                return (
                  <tr key={s.id} className="border-b border-[var(--color-borde)] last:border-0">
                    <td className="px-4 py-3">
                      <div>{s.routeName}</div>
                      <div className="text-xs text-[var(--color-texto-suave)]">
                        {s.origin} → {s.destination}
                      </div>
                    </td>
                    <td className="tabular px-4 py-3">{formatCaracasDateTime24(s.departsAt)}</td>
                    <td className="tabular px-4 py-3">{s.vehiclePlate}</td>
                    <td className="px-4 py-3">{s.driverName}</td>
                    <td className="px-4 py-3">
                      <div className="tabular">
                        {s.occupied}/{s.capacity}
                      </div>
                      <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-[var(--color-borde)]">
                        <div
                          role="img"
                          aria-label={`${s.occupied} de ${s.capacity} puestos ocupados`}
                          className={`h-full rounded-full transition-colors duration-150 motion-reduce:transition-none ${
                            pct >= 90 ? "bg-[var(--color-alerta)]" : "bg-[var(--color-acento)]"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={departureStatusLabel(s.status)} tone={departureStatusTone(s.status)} />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/panel/salidas/${s.id}`} className={panelButtonClass("secundario", "sm")}>
                        Abrir hoja
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableShell>
      )}

      {crearAbierto ? (
        <SidePanel title="Crear salida" closeHref={closeHref}>
          <DepartureForm
            routes={rutas}
            vehicles={vehiculos.filter((v) => v.active)}
            drivers={choferes.filter((c) => c.active)}
            error={error}
          />
        </SidePanel>
      ) : null}
    </div>
  );
}
