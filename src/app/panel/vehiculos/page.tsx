import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { listVehicles } from "@/modules/agencies";
import { createVehicleAction, updateVehicleAction } from "../flota/actions";

export default async function VehiculosPage() {
  const user = await requirePanelUser("fleet.manage");
  const agencyId = requireAgencyScope(user);
  const vehiculos = await listVehicles(agencyId);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Vehículos</h1>

      <section className="overflow-x-auto rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-[var(--color-borde)] text-[var(--color-texto-suave)]">
            <tr>
              <th className="px-4 py-3 font-medium">Placa</th>
              <th className="px-4 py-3 font-medium">Marca</th>
              <th className="px-4 py-3 font-medium">Modelo</th>
              <th className="px-4 py-3 font-medium">Asientos</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Editar</th>
            </tr>
          </thead>
          <tbody>
            {vehiculos.map((v) => {
              const formId = `veh-${v.id}`;
              return (
                <tr key={v.id} className="border-b border-[var(--color-borde)] last:border-0">
                  <td className="tabular px-4 py-3">{v.plate}</td>
                  <td className="px-4 py-3">
                    <input
                      form={formId}
                      name="brand"
                      defaultValue={v.brand}
                      className="w-28 rounded-md border border-[var(--color-borde)] bg-[var(--color-fondo)] px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      form={formId}
                      name="model"
                      defaultValue={v.model}
                      className="w-28 rounded-md border border-[var(--color-borde)] bg-[var(--color-fondo)] px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      form={formId}
                      name="seatCount"
                      type="number"
                      min={4}
                      max={80}
                      defaultValue={v.seatCount}
                      className="tabular w-20 rounded-md border border-[var(--color-borde)] bg-[var(--color-fondo)] px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      form={formId}
                      name="active"
                      defaultValue={String(v.active)}
                      className="rounded-md border border-[var(--color-borde)] bg-[var(--color-fondo)] px-2 py-1 text-sm"
                    >
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <form id={formId} action={updateVehicleAction}>
                      <input type="hidden" name="vehicleId" value={v.id} />
                      <button
                        type="submit"
                        className="rounded-md bg-[var(--color-acento)] px-3 py-1.5 text-sm font-medium text-white"
                      >
                        Guardar
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {vehiculos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[var(--color-texto-suave)]">
                  Todavía no hay vehículos registrados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-4 border-t border-[var(--color-borde)] pt-8">
        <h2 className="text-lg font-semibold">Registrar vehículo</h2>
        <form action={createVehicleAction} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Placa
            <input
              name="plate"
              required
              className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Marca
            <input
              name="brand"
              required
              className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Modelo
            <input
              name="model"
              required
              className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Asientos
            <input
              name="seatCount"
              type="number"
              min={4}
              max={80}
              required
              className="w-24 rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-[var(--color-acento)] px-5 py-2.5 text-sm font-medium text-white"
          >
            Registrar
          </button>
        </form>
      </section>
    </div>
  );
}
