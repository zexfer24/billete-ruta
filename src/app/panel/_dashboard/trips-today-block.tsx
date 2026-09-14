import Link from "next/link";
import type { AgencyDepartureRow } from "@/modules/catalog";
import { departureStatusLabel, departureStatusTone } from "@/lib/labels";
import { formatCaracasTime24 } from "@/lib/time";
import { ClickableRow } from "@/components/clickable-row";
import { EmptyState, SectionCard, StatusBadge, TableShell, panelButtonClass } from "@/components/panel-ui";

/** Hora en formato de 24 horas, o guion si el hito todavía no ocurrió. */
function hora(date: Date | null): string {
  return date ? formatCaracasTime24(date) : "—";
}

/**
 * Bloque "Embarques y desembarques de hoy" del tablero: las salidas del día
 * en curso con sus horas de embarque, partida y llegada.
 */
export function TripsTodayBlock({
  departures,
  registrarSalidaHref,
}: {
  departures: AgencyDepartureRow[];
  registrarSalidaHref: string;
}) {
  return (
    <SectionCard
      title="Embarques y desembarques de hoy"
      action={
        <Link href="/panel/salidas" className={panelButtonClass("secundario", "sm")}>
          Ver salidas
        </Link>
      }
    >
      {departures.length === 0 ? (
        <EmptyState
          title="No hay salidas programadas para hoy."
          action={
            <Link href={registrarSalidaHref} scroll={false} className={panelButtonClass("primario", "sm")}>
              Crear salida
            </Link>
          }
        />
      ) : (
        <TableShell>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[var(--color-borde)] text-[var(--color-texto-suave)]">
              <tr>
                <th className="px-4 py-3 font-medium">Hora</th>
                <th className="px-4 py-3 font-medium">Ruta</th>
                <th className="px-4 py-3 font-medium">Unidad y chofer</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Embarque</th>
                <th className="px-4 py-3 font-medium">Salida</th>
                <th className="px-4 py-3 font-medium">Llegada</th>
              </tr>
            </thead>
            <tbody>
              {departures.map((salida) => (
                <ClickableRow
                  key={salida.id}
                  href={`/panel/salidas/${salida.id}`}
                  className="border-b border-[var(--color-borde)] last:border-0"
                >
                  <td className="tabular px-4 py-3">{formatCaracasTime24(salida.departsAt)}</td>
                  <td className="px-4 py-3">{salida.routeName}</td>
                  <td className="px-4 py-3">
                    {salida.vehiclePlate} · {salida.driverName}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={departureStatusLabel(salida.status)}
                      tone={departureStatusTone(salida.status)}
                    />
                  </td>
                  <td className="tabular px-4 py-3">{hora(salida.boardingStartedAt)}</td>
                  <td className="tabular px-4 py-3">{hora(salida.departedAt)}</td>
                  <td className="tabular px-4 py-3">{hora(salida.arrivedAt)}</td>
                </ClickableRow>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}
    </SectionCard>
  );
}
