import { z } from "zod";
import { requirePanelUser } from "@/modules/auth";
import { agencyMovements, last24h } from "@/modules/reports";
import { listAgencies } from "@/modules/agencies";
import { formatCaracasDate, formatCaracasDateTime24, formatDuration } from "@/lib/time";

const searchParamsSchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  agency: z.string().uuid().optional(),
});

function parseDateRange(fromRaw: string | undefined, toRaw: string | undefined): { from: Date; to: Date } {
  const fallback = last24h();
  if (!fromRaw || !toRaw) return fallback;
  const from = new Date(`${fromRaw}T00:00:00-04:00`);
  const to = new Date(`${toRaw}T23:59:59-04:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return fallback;
  return { from, to };
}

function dateInputValue(date: Date): string {
  return formatCaracasDate(date).split("/").reverse().join("-");
}

function timeCell(date: Date | null): string {
  return date ? formatCaracasDateTime24(date) : "—";
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export default async function MovimientosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; agency?: string }>;
}) {
  await requirePanelUser("agency.reports");
  const rawParams = searchParamsSchema.parse(await searchParams);
  const { from, to } = parseDateRange(rawParams.from, rawParams.to);
  const agencyId = rawParams.agency;

  const [movements, agencies] = await Promise.all([
    agencyMovements(from, to, agencyId),
    listAgencies(),
  ]);

  const csvHeaders = [
    "Agencia",
    "Ruta",
    "Chofer",
    "Unidad",
    "Hora de embarque",
    "Hora de salida",
    "Hora de desembarque",
    "Duración",
    "Pasajeros",
  ];
  const csvRows = movements.map((m) => [
    m.agencyName,
    `${m.routeName} (${m.origin} -> ${m.destination})`,
    m.driverName,
    m.vehiclePlate,
    m.boardingStartedAt ? formatCaracasDateTime24(m.boardingStartedAt) : "",
    m.departedAt ? formatCaracasDateTime24(m.departedAt) : "",
    m.arrivedAt ? formatCaracasDateTime24(m.arrivedAt) : "",
    m.durationMinutes !== null ? formatDuration(m.durationMinutes) : "",
    String(m.passengerCount),
  ]);
  const csvContent = [csvHeaders, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Movimientos de las agencias</h2>
        <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
          Embarque, salida y desembarque registrados por los choferes de todas las agencias del terminal.
        </p>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4"
      >
        <div>
          <label htmlFor="from" className="block text-xs font-medium text-[var(--color-texto-suave)]">
            Desde
          </label>
          <input
            type="date"
            id="from"
            name="from"
            defaultValue={dateInputValue(from)}
            className="mt-1 rounded-md border border-[var(--color-borde)] px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="to" className="block text-xs font-medium text-[var(--color-texto-suave)]">
            Hasta
          </label>
          <input
            type="date"
            id="to"
            name="to"
            defaultValue={dateInputValue(to)}
            className="mt-1 rounded-md border border-[var(--color-borde)] px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="agency" className="block text-xs font-medium text-[var(--color-texto-suave)]">
            Agencia
          </label>
          <select
            id="agency"
            name="agency"
            defaultValue={agencyId ?? ""}
            className="mt-1 rounded-md border border-[var(--color-borde)] px-3 py-1.5 text-sm"
          >
            <option value="">Todas las agencias</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-[var(--color-acento)] px-4 py-1.5 text-sm font-medium text-white"
        >
          Filtrar
        </button>
        <a
          href={csvHref}
          download="movimientos-ticketruta.csv"
          className="ml-auto rounded-md border border-[var(--color-borde)] px-4 py-1.5 text-sm font-medium hover:bg-[var(--color-acento-suave)]"
        >
          Exportar CSV
        </a>
      </form>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-[var(--color-borde)] text-xs uppercase tracking-wide text-[var(--color-texto-suave)]">
            <tr>
              <th className="px-4 py-3">Agencia</th>
              <th className="px-4 py-3">Ruta</th>
              <th className="px-4 py-3">Chofer</th>
              <th className="px-4 py-3">Unidad</th>
              <th className="px-4 py-3">Embarque</th>
              <th className="px-4 py-3">Salida</th>
              <th className="px-4 py-3">Desembarque</th>
              <th className="px-4 py-3">Duración</th>
              <th className="px-4 py-3 text-right">Pasajeros</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.tripLogId} className="border-b border-[var(--color-borde)] last:border-0">
                <td className="px-4 py-2">{m.agencyName}</td>
                <td className="px-4 py-2">
                  {m.routeName}{" "}
                  <span className="text-[var(--color-texto-suave)]">
                    ({m.origin} → {m.destination})
                  </span>
                </td>
                <td className="px-4 py-2">{m.driverName}</td>
                <td className="px-4 py-2 tabular">{m.vehiclePlate}</td>
                <td className="px-4 py-2 tabular">{timeCell(m.boardingStartedAt)}</td>
                <td className="px-4 py-2 tabular">{timeCell(m.departedAt)}</td>
                <td className="px-4 py-2 tabular">{timeCell(m.arrivedAt)}</td>
                <td className="px-4 py-2 tabular">
                  {m.durationMinutes !== null ? formatDuration(m.durationMinutes) : "—"}
                </td>
                <td className="px-4 py-2 text-right tabular">{m.passengerCount}</td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-[var(--color-texto-suave)]">
                  No hay movimientos en el rango seleccionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
