import { Prisma } from "@prisma/client";
import type { RouteRevenueRow } from "@/modules/reports";
import {
  DASHBOARD_PERIODS,
  DASHBOARD_PERIOD_LABELS,
  caracasDayInputValue,
  caracasHourValue,
  formatCaracasDateTime24,
} from "@/lib/time";
import { formatMoney, round2, ZERO } from "@/lib/decimal";
import {
  EmptyState,
  PANEL_LABEL_CLASS,
  PanelTabs,
  StatCard,
  TableShell,
  panelButtonClass,
  panelInputClass,
} from "@/components/panel-ui";
import type { ReportRange } from "./range";

/** Horas "00" a "23" para los <select> de filtro, en formato de 24 horas. */
const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));

const BASE_HREF = "/panel/reportes?vista=recaudacion";

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildCsv(filas: RouteRevenueRow[]): string {
  const header = ["Ruta", "Origen", "Destino", "Total USD", "Pagos"];
  const lines = filas.map((f) =>
    [f.routeName, f.origin, f.destination, f.totalUsd.toString(), String(f.payments)]
      .map(csvField)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

/** Porcentaje entero de `parte` sobre `total`, calculado con `Prisma.Decimal`. "—" si el total es cero. */
function sharePercent(parte: Prisma.Decimal, total: Prisma.Decimal): number | null {
  if (total.isZero()) return null;
  return parte.mul(100).div(total).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
}

/** Vista de recaudación por ruta: accesos de periodo, rango personalizado, indicadores y tabla. */
export function RevenueView({ range, filas }: { range: ReportRange; filas: RouteRevenueRow[] }) {
  const total = filas.reduce((acc, f) => round2(acc.add(f.totalUsd)), ZERO);
  const totalPagos = filas.reduce((acc, f) => acc + f.payments, 0);
  const csv = buildCsv(filas);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanelTabs label="Periodo" tabs={periodoTabs} />
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
          download="recaudacion.csv"
          className={panelButtonClass("secundario")}
        >
          Exportar CSV
        </a>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <input type="hidden" name="vista" value="recaudacion" />
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
          Hora
          <select
            name="horaDesde"
            defaultValue={caracasHourValue(range.from)}
            className={panelInputClass()}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}:00
              </option>
            ))}
          </select>
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
        <label className={PANEL_LABEL_CLASS}>
          Hora
          <select
            name="horaHasta"
            defaultValue={caracasHourValue(range.to)}
            className={panelInputClass()}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}:59
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={panelButtonClass("secundario")}>
          Aplicar rango
        </button>
      </form>

      <p className="text-sm text-[var(--color-texto-suave)]">
        Del {formatCaracasDateTime24(range.from)} al {formatCaracasDateTime24(range.to)}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total recaudado" value={formatMoney(total, "USD")} />
        <StatCard label="Pagos registrados" value={totalPagos} />
        <StatCard label="Rutas con ingresos" value={filas.length} />
      </div>

      <TableShell>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--color-borde)] text-[var(--color-texto-suave)]">
            <tr>
              <th className="px-4 py-3 font-medium">Ruta</th>
              <th className="px-4 py-3 font-medium">Total USD</th>
              <th className="px-4 py-3 font-medium">Pagos</th>
              <th className="px-4 py-3 font-medium">Participación</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const porcentaje = sharePercent(f.totalUsd, total);
              return (
                <tr key={f.routeId} className="border-b border-[var(--color-borde)] last:border-0">
                  <td className="px-4 py-3">
                    {f.routeName} ({f.origin} → {f.destination})
                  </td>
                  <td className="tabular px-4 py-3">{formatMoney(f.totalUsd, "USD")}</td>
                  <td className="tabular px-4 py-3">{f.payments}</td>
                  <td className="px-4 py-3">
                    {porcentaje === null ? (
                      "—"
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          role="img"
                          aria-label={`${porcentaje} % del total`}
                          className="h-1 rounded-full bg-[var(--color-acento)]"
                          style={{ width: `${porcentaje}%` }}
                        />
                        <span className="tabular">{porcentaje} %</span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-[var(--color-borde)] font-semibold">
              <td className="px-4 py-3">Total</td>
              <td className="tabular px-4 py-3">{formatMoney(total, "USD")}</td>
              <td className="tabular px-4 py-3">{totalPagos}</td>
              <td className="px-4 py-3" />
            </tr>
          </tfoot>
        </table>
      </TableShell>

      {filas.length === 0 ? <EmptyState title="No hay pagos registrados en este rango." /> : null}
    </div>
  );
}
