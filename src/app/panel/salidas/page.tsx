import Link from "next/link";
import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { listAgencyDepartures, listRoutes } from "@/modules/catalog";
import { listDrivers, listVehicles } from "@/modules/agencies";
import { formatCaracasDateTime24 } from "@/lib/time";
import { createDepartureAction } from "./actions";

export default async function SalidasPage() {
  const user = await requirePanelUser("departures.manage");
  const agencyId = requireAgencyScope(user);

  const [salidas, rutas, vehiculos, choferes] = await Promise.all([
    listAgencyDepartures(agencyId),
    listRoutes(agencyId),
    listVehicles(agencyId),
    listDrivers(agencyId),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Salidas</h1>

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
            Fecha y hora (Caracas)
            <input
              type="datetime-local"
              name="departsAt"
              required
              className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
            />
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
