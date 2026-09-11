import { z } from "zod";
import Link from "next/link";
import { requirePanelUser } from "@/modules/auth";
import { agencyMovements, getTripDetail, last24h } from "@/modules/reports";
import { listAgencies } from "@/modules/agencies";
import {
  formatCaracasDate,
  formatCaracasDateTime24,
  formatCaracasTime24,
  formatDuration,
} from "@/lib/time";
import { SidePanel } from "@/components/side-panel";
import { ClickableRow } from "@/components/clickable-row";

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
  viaje: z.string().uuid().optional().catch(undefined),
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
  searchParams: Promise<{ from?: string; to?: string; agency?: string; viaje?: string }>;
}) {
  const user = await requirePanelUser("terminal.dashboard");
  const rawParams = searchParamsSchema.parse(await searchParams);
  const { from, to } = parseDateRange(rawParams.from, rawParams.to);
  const agencyId = rawParams.agency;
  const viajeId = rawParams.viaje;

  function buildTripHref(viaje?: string): string {
    const params = new URLSearchParams();
    if (rawParams.from) params.set("from", rawParams.from);
    if (rawParams.to) params.set("to", rawParams.to);
    if (rawParams.agency) params.set("agency", rawParams.agency);
    if (viaje) params.set("viaje", viaje);
    const query = params.toString();
    return query ? `/panel/admin/movimientos?${query}` : "/panel/admin/movimientos";
  }

  const [movements, agencies, detail] = await Promise.all([
    agencyMovements(from, to, agencyId),
    listAgencies(),
    viajeId ? getTripDetail(viajeId, user.id) : Promise.resolve(null),
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
        <table className="w-full min-w-[980px] text-left text-sm">
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
              <th className="px-4 py-3">
                <span className="sr-only">Detalle</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => {
              const rowHref = buildTripHref(m.tripLogId);
              return (
                <ClickableRow
                  key={m.tripLogId}
                  href={rowHref}
                  selected={m.tripLogId === viajeId}
                  className="border-b border-[var(--color-borde)] last:border-0"
                >
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
                  <td className="px-4 py-2">
                    <Link href={rowHref} scroll={false} className="text-[var(--color-acento)] underline">
                      Ver
                    </Link>
                  </td>
                </ClickableRow>
              );
            })}
            {movements.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-[var(--color-texto-suave)]">
                  No hay movimientos en el rango seleccionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <SidePanel
          title={detail.routeName}
          subtitle={`${detail.agencyName} · salida programada ${formatCaracasDateTime24(detail.departsAt)}`}
          closeHref={buildTripHref()}
        >
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="font-medium text-[var(--color-texto-suave)]">Agencia</dt>
            <dd>{detail.agencyName}</dd>
            <dt className="font-medium text-[var(--color-texto-suave)]">Ruta</dt>
            <dd>
              {detail.routeName} ({detail.origin} → {detail.destination})
            </dd>
            <dt className="font-medium text-[var(--color-texto-suave)]">Punto de embarque</dt>
            <dd>{detail.meetingPoint}</dd>
            <dt className="font-medium text-[var(--color-texto-suave)]">Chofer</dt>
            <dd>
              {detail.driverName} · C.I. {detail.driverIdNumber}
            </dd>
            <dt className="font-medium text-[var(--color-texto-suave)]">Unidad</dt>
            <dd>
              {detail.vehiclePlate} · {detail.vehicleBrand} {detail.vehicleModel}
            </dd>
            <dt className="font-medium text-[var(--color-texto-suave)]">Embarque</dt>
            <dd>{timeCell(detail.boardingStartedAt)}</dd>
            <dt className="font-medium text-[var(--color-texto-suave)]">Salida</dt>
            <dd>{timeCell(detail.departedAt)}</dd>
            <dt className="font-medium text-[var(--color-texto-suave)]">Desembarque</dt>
            <dd>{timeCell(detail.arrivedAt)}</dd>
            <dt className="font-medium text-[var(--color-texto-suave)]">Duración</dt>
            <dd>{detail.durationMinutes !== null ? formatDuration(detail.durationMinutes) : "—"}</dd>
            <dt className="font-medium text-[var(--color-texto-suave)]">Pasajeros</dt>
            <dd>{detail.passengerCount}</dd>
          </dl>

          <div className="mt-6">
            <h3 className="text-sm font-semibold tracking-tight">
              Pasajeros a bordo ({detail.passengers.length})
            </h3>
            {detail.passengers.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--color-texto-suave)]">
                Aún no hay pasajeros a bordo.
              </p>
            ) : (
              <div className="mt-2 overflow-x-auto rounded-lg border border-[var(--color-borde)]">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[var(--color-borde)] text-xs uppercase tracking-wide text-[var(--color-texto-suave)]">
                    <tr>
                      <th className="px-3 py-2">Pasajero</th>
                      <th className="px-3 py-2">Cédula</th>
                      <th className="px-3 py-2">Serial</th>
                      <th className="px-3 py-2">Abordó</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.passengers.map((p) => (
                      <tr key={p.id} className="border-b border-[var(--color-borde)] last:border-0">
                        <td className="px-3 py-2">
                          {p.fullName}
                          {p.isHolder ? " (titular)" : ""}
                        </td>
                        <td className="px-3 py-2 tabular">{p.idNumber}</td>
                        <td className="px-3 py-2 tabular">{p.reservationCode}</td>
                        <td className="px-3 py-2 tabular">{formatCaracasTime24(p.boardedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="mt-6 text-xs text-[var(--color-texto-suave)]">
            Consulta registrada en la bitácora de auditoría.
          </p>
        </SidePanel>
      )}
    </div>
  );
}
