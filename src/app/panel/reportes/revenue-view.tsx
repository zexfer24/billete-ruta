import Link from "next/link";
import { Prisma } from "@prisma/client";
import type { RouteRevenueRow } from "@/modules/reports";
import { formatMoney, round2, ZERO } from "@/lib/decimal";
import { IconCash, IconChart, IconRoute } from "@/components/icons";
import {
  EmptyState,
  MobileCard,
  PANEL_TD_CLASS,
  PANEL_TH_CLASS,
  ProgressBar,
  StatCard,
  TableShell,
  panelButtonClass,
} from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import { routeSubtitle } from "../_shared/route-text";
import { ReportRangeLine } from "./report-range-line";
import type { ReportRange } from "./range";

/** Porcentaje entero de `parte` sobre `total`, calculado con `Prisma.Decimal`. `null` si el total es cero. */
function sharePercent(parte: Prisma.Decimal, total: Prisma.Decimal): number | null {
  if (total.isZero()) return null;
  return parte.mul(100).div(total).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
}

/** Barra de participación de una ruta en el total del periodo. */
function Share({ percent }: { percent: number | null }) {
  if (percent === null) return <span className="text-tinta-suave">Sin cobros</span>;
  return <ProgressBar value={percent} max={100} label={`${percent} % del total`} />;
}

/** Origen y destino bajo el nombre de la ruta, solo si el nombre no los dice ya. */
function RouteSubtitle({ row }: { row: RouteRevenueRow }) {
  const texto = routeSubtitle(row.routeName, row.origin, row.destination);
  return texto ? <p className="text-sm text-tinta-suave">{texto}</p> : null;
}

/**
 * Recaudación por ruta: el rango aplicado, tres cifras del periodo y la tabla
 * (tarjetas en el teléfono) con la participación de cada ruta. Sin cobros,
 * solo un estado vacío que sugiere mirar un periodo más largo.
 */
export function RevenueView({
  range,
  filas,
  downloadHref,
}: {
  range: ReportRange;
  filas: RouteRevenueRow[];
  downloadHref: string;
}) {
  if (filas.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <ReportRangeLine range={range} />
        <EmptyState
          icon={<IconCash />}
          title="No hubo cobros en este periodo"
          description="Aquí se suman los comprobantes aprobados y los cobros en efectivo. Prueba con un periodo más largo."
          action={
            range.preset !== "30d" ? (
              <Link href="/panel/reportes?vista=recaudacion&periodo=30d" className={panelButtonClass("secundario")}>
                Ver los últimos 30 días
              </Link>
            ) : undefined
          }
        />
      </div>
    );
  }

  const total = filas.reduce((acc, f) => round2(acc.add(f.totalUsd)), ZERO);
  const totalPagos = filas.reduce((acc, f) => acc + f.payments, 0);
  // La ruta que más cobró (la primera si empatan): dice algo que la tabla no dice de un vistazo.
  const mejor = filas.reduce((a, b) => (b.totalUsd.greaterThan(a.totalUsd) ? b : a));
  const mejorParte = sharePercent(mejor.totalUsd, total);

  return (
    <div className="flex flex-col gap-6">
      <ReportRangeLine range={range} downloadHref={downloadHref} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total cobrado"
          value={formatMoney(total, "USD")}
          detail="Comprobantes aprobados y cobros en efectivo"
          tone="marca"
          icon={<IconCash />}
        />
        <StatCard label="Pagos registrados" value={totalPagos} detail="Cada abono cuenta por separado" icon={<IconChart />} />
        <StatCard
          label="Ruta que más cobró"
          value={formatMoney(mejor.totalUsd, "USD")}
          detail={
            filas.length === 1
              ? `${mejor.routeName}, la única ruta con cobros`
              : `${mejor.routeName}${mejorParte !== null ? `, ${mejorParte} % del total` : ""}`
          }
          icon={<IconRoute />}
        />
      </div>

      <TableShell
        mobile={
          <ul className="flex flex-col gap-3">
            {filas.map((f) => (
              <MobileCard
                key={f.routeId}
                title={f.routeName}
                subtitle={routeSubtitle(f.routeName, f.origin, f.destination) ?? undefined}
                details={[
                  { label: "Total cobrado", value: formatMoney(f.totalUsd, "USD") },
                  { label: "Pagos", value: f.payments },
                ]}
                action={
                  <div className="w-full">
                    <Share percent={sharePercent(f.totalUsd, total)} />
                  </div>
                }
              />
            ))}
          </ul>
        }
      >
        <table className="w-full min-w-[680px]">
          <thead className="border-b border-borde bg-lienzo">
            <tr>
              <th scope="col" className={PANEL_TH_CLASS}>Ruta</th>
              <th scope="col" className={cx(PANEL_TH_CLASS, "text-right")}>Total cobrado</th>
              <th scope="col" className={cx(PANEL_TH_CLASS, "text-right")}>Pagos</th>
              <th scope="col" className={cx(PANEL_TH_CLASS, "w-64")}>Parte del total</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.routeId} className="border-b border-borde last:border-0">
                <td className={PANEL_TD_CLASS}>
                  <p className="font-semibold">{f.routeName}</p>
                  <RouteSubtitle row={f} />
                </td>
                <td className={cx(PANEL_TD_CLASS, "tabular text-right font-semibold")}>{formatMoney(f.totalUsd, "USD")}</td>
                <td className={cx(PANEL_TD_CLASS, "tabular text-right")}>{f.payments}</td>
                <td className={PANEL_TD_CLASS}>
                  <Share percent={sharePercent(f.totalUsd, total)} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-borde bg-lienzo">
            <tr>
              <th scope="row" className={cx(PANEL_TD_CLASS, "text-left font-bold")}>
                Total
              </th>
              <td className={cx(PANEL_TD_CLASS, "tabular text-right font-bold")}>{formatMoney(total, "USD")}</td>
              <td className={cx(PANEL_TD_CLASS, "tabular text-right font-bold")}>{totalPagos}</td>
              <td className={PANEL_TD_CLASS} />
            </tr>
          </tfoot>
        </table>
      </TableShell>
    </div>
  );
}
