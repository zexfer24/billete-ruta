import Link from "next/link";
import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { listAgencyDepartures, listRoutes } from "@/modules/catalog";
import { listDrivers, listVehicles } from "@/modules/agencies";
import { formatCaracasDateTime24 } from "@/lib/time";
import { createDepartureAction } from "./actions";

/** Horas de salida en formato de 24 horas, cada media hora. */
const HORAS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

export default async function SalidasPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const user = await requirePanelUser("departures.manage");
  const agencyId = requireAgencyScope(user);
  const { ver } = await searchParams;
  const historial = ver === "historial";

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

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Salidas</h1>
        <nav className="flex gap-1 rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] p-1 text-sm font-medium">
          <Link
            href="/panel/salidas"
            className={`rounded-md px-3 py-1.5 ${
              historial ? "text-[var(--color-texto-suave)]" : "bg-[var(--color-acento-suave)] text-[var(--color-acento)]"
            }`}
          >
            Próximas
          </Link>
          <Link
            href="/panel/salidas?ver=historial"
            className={`rounded-md px-3 py-1.5 ${
              historial ? "bg-[var(--color-acento-suave)] text-[var(--color-acento)]" : "text-[var(--color-texto-suave)]"
            }`}
          >
            Historial
          </Link>
        </nav>
      </div>
      <p className="-mt-4 text-sm text-[var(--color-texto-suave)]">
        {historial
          ? "Viajes de los últimos 30 días, del más reciente al más antiguo."
          : `${salidas.length} salida(s) programada(s) de aquí en adelante.`}
      </p>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]">
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
            {salidas.map((s) => (
              <tr key={s.id} className="border-b border-[var(--color-borde)] last:border-0">
                <td className="px-4 py-3">{s.routeName}</td>
                <td className="tabular px-4 py-3">{formatCaracasDateTime24(s.departsAt)}</td>
                <td className="tabular px-4 py-3">{s.vehiclePlate}</td>
                <td className="px-4 py-3">{s.driverName}</td>
                <td className="tabular px-4 py-3">
                  {s.occupied}/{s.capacity}
                </td>
                <td className="px-4 py-3">{s.status}</td>
                <td className="px-4 py-3">
                  <Link href={`/panel/salidas/${s.id}`} className="text-[var(--color-acento)] underline">
                    Manifiesto
                  </Link>
                </td>
              </tr>
            ))}
            {salidas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-[var(--color-texto-suave)]">
                  No hay salidas en el rango reciente.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <section className="flex flex-col gap-4 border-t border-[var(--color-borde)] pt-8">
        <h2 className="text-lg font-semibold">Crear salida</h2>
        <form action={createDepartureAction} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Ruta
            <select
              name="routeId"
              required
              className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
            >
              {rutas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Vehículo
            <select
              name="vehicleId"
              required
              className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
            >
              {vehiculos
                .filter((v) => v.active)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Chofer
            <select
              name="driverId"
              required
              className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
            >
              {choferes
                .filter((c) => c.active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Fecha (Caracas)
            <input
              type="date"
              name="fecha"
              required
              className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Hora de salida
            <select
              name="hora"
              required
              defaultValue="06:00"
              className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm tabular"
            >
              {HORAS.map((hora) => (
                <option key={hora} value={hora}>
                  {hora}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-[var(--color-acento)] px-5 py-2.5 text-sm font-medium text-white"
          >
            Crear
          </button>
        </form>
      </section>
    </div>
  );
}
