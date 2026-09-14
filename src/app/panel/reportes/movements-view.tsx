import type { DriverMovementRow } from "@/modules/reports";
import {
  DASHBOARD_PERIODS,
  DASHBOARD_PERIOD_LABELS,
  caracasDayInputValue,
  formatCaracasDateTime24,
  formatDuration,
} from "@/lib/time";
import {
  EmptyState,
  PANEL_LABEL_CLASS,
  PanelTabs,
  TableShell,
  panelButtonClass,
  panelInputClass,
} from "@/components/panel-ui";
import type { ReportRange } from "./range";

const BASE_HREF = "/panel/reportes?vista=movimientos";

/** Vista de movimientos de choferes: accesos de periodo, rango personalizado y tabla. */
export function MovementsView({ range, movimientos }: { range: ReportRange; movimientos: DriverMovementRow[] }) {
  const periodoTabs = [
    { href: BASE_HREF, label: "Últimas 24 h", active: range.preset === "24h" },
    ...DASHBOARD_PERIODS.map((periodo) => ({
      href: `${BASE_HREF}&periodo=${periodo}`,
      label: DASHBOARD_PERIOD_LABELS[periodo],
      active: range.preset === periodo,
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PanelTabs label="Periodo" tabs={periodoTabs} />

      <form className="flex flex-wrap items-end gap-3" method="get">
        <input type="hidden" name="vista" value="movimientos" />
        <label className={PANEL_LABEL_CLASS}>
          Desde
          <input
            type="date"
            name="desde"
            defaultValue={caracasDayInputValue(range.from)}
            className={panelInputClass()}
          />
        </label>
        <label className={PANEL_LABEL_CLASS}>
          Hasta
          <input
            type="date"
            name="hasta"
            defaultValue={caracasDayInputValue(range.to)}
            className={panelInputClass()}
          />
        </label>
        <button type="submit" className={panelButtonClass("secundario")}>
          Aplicar rango
        </button>
      </form>

      <TableShell>
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-[var(--color-borde)] text-[var(--color-texto-suave)]">
            <tr>
              <th className="px-4 py-3 font-medium">Chofer</th>
              <th className="px-4 py-3 font-medium">Unidad</th>
              <th className="px-4 py-3 font-medium">Ruta</th>
              <th className="px-4 py-3 font-medium">Embarque</th>
              <th className="px-4 py-3 font-medium">Salida</th>
              <th className="px-4 py-3 font-medium">Desembarque</th>
              <th className="px-4 py-3 font-medium">Duración</th>
              <th className="px-4 py-3 font-medium">Pasajeros</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map((m) => (
              <tr key={m.tripLogId} className="border-b border-[var(--color-borde)] last:border-0">
                <td className="px-4 py-3">{m.driverName}</td>
                <td className="tabular px-4 py-3">{m.vehiclePlate}</td>
                <td className="px-4 py-3">{m.routeName}</td>
                <td className="tabular px-4 py-3">
                  {m.boardingStartedAt ? formatCaracasDateTime24(m.boardingStartedAt) : "—"}
                </td>
                <td className="tabular px-4 py-3">
                  {m.departedAt ? formatCaracasDateTime24(m.departedAt) : "—"}
                </td>
                <td className="tabular px-4 py-3">
                  {m.arrivedAt ? formatCaracasDateTime24(m.arrivedAt) : "—"}
                </td>
                <td className="tabular px-4 py-3">
                  {m.durationMinutes !== null ? formatDuration(m.durationMinutes) : "—"}
                </td>
                <td className="tabular px-4 py-3">{m.passengerCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      {movimientos.length === 0 ? <EmptyState title="No hay movimientos en este rango." /> : null}
    </div>
  );
}
