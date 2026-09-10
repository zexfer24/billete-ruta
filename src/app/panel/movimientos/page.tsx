import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { driverMovements, last24h } from "@/modules/reports";
import { formatCaracas, formatCaracasDateTime24, formatDuration } from "@/lib/time";

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

export default async function MovimientosPage({
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

  const movimientos = await driverMovements(agencyId, from, to);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Movimientos</h1>

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

      <div className="overflow-x-auto rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]">
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
            {movimientos.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-[var(--color-texto-suave)]">
                  No hay movimientos en el rango indicado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
