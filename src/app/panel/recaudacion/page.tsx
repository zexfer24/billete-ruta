import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { last24h, revenueByRoute } from "@/modules/reports";
import type { RouteRevenueRow } from "@/modules/reports";
import { formatCaracas, formatCaracasDateTime24 } from "@/lib/time";
import { formatMoney, round2, ZERO } from "@/lib/decimal";

function fromCaracasLocalInput(value: string): Date {
  return new Date(`${value}:00-04:00`);
}

function parseDateInput(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const d = fromCaracasLocalInput(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function toLocalInputValue(date: Date): string {
  return formatCaracas(date, "yyyy-MM-dd'T'HH:mm");
}

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

export default async function RecaudacionPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const user = await requirePanelUser("agency.reports");
  const agencyId = requireAgencyScope(user);
  const params = await searchParams;

  const defaults = last24h();
  const from = parseDateInput(params.desde, defaults.from);
  const to = parseDateInput(params.hasta, defaults.to);

  const filas = await revenueByRoute(agencyId, from, to);
  const total = filas.reduce((acc, f) => round2(acc.add(f.totalUsd)), ZERO);
  const totalPagos = filas.reduce((acc, f) => acc + f.payments, 0);
  const csv = buildCsv(filas);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Recaudación por ruta</h1>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
          download="recaudacion.csv"
          className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 py-2 text-sm font-medium"
        >
          Exportar CSV
        </a>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Desde
          <input
            type="datetime-local"
            name="desde"
            defaultValue={toLocalInputValue(from)}
            className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Hasta
          <input
            type="datetime-local"
            name="hasta"
            defaultValue={toLocalInputValue(to)}
            className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-[var(--color-acento)] px-4 py-2 text-sm font-medium text-white"
        >
          Filtrar
        </button>
      </form>

      <p className="text-sm text-[var(--color-texto-suave)]">
        Del {formatCaracasDateTime24(from)} al {formatCaracasDateTime24(to)}
      </p>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="border-b border-[var(--color-borde)] text-[var(--color-texto-suave)]">
            <tr>
              <th className="px-4 py-3 font-medium">Ruta</th>
              <th className="px-4 py-3 font-medium">Total USD</th>
              <th className="px-4 py-3 font-medium">Pagos</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.routeId} className="border-b border-[var(--color-borde)] last:border-0">
                <td className="px-4 py-3">
                  {f.routeName} ({f.origin} → {f.destination})
                </td>
                <td className="tabular px-4 py-3">{formatMoney(f.totalUsd, "USD")}</td>
                <td className="tabular px-4 py-3">{f.payments}</td>
              </tr>
            ))}
            {filas.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-[var(--color-texto-suave)]">
                  No hay pagos registrados en el rango indicado.
                </td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr className="border-t border-[var(--color-borde)] font-semibold">
              <td className="px-4 py-3">Total</td>
              <td className="tabular px-4 py-3">{formatMoney(total, "USD")}</td>
              <td className="tabular px-4 py-3">{totalPagos}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
