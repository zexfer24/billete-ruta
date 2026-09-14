import Link from "next/link";
import { z } from "zod";
import { requireAgencyUser } from "@/modules/auth";
import { listVehicles } from "@/modules/agencies";
import { SidePanel } from "@/components/side-panel";
import { ClickableRow } from "@/components/clickable-row";
import { PanelFeedback } from "@/components/panel-feedback";
import { createVehicleAction, updateVehicleAction } from "../flota/actions";

/** Traduce el código corto de `?ok=` a un texto. Un código desconocido no muestra nada. */
const OK_LABELS: Record<string, string> = {
  "vehiculo-creado": "Vehículo registrado con éxito.",
  "vehiculo-actualizado": "Vehículo actualizado con éxito.",
};

export default async function VehiculosPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; error?: string; ok?: string }>;
}) {
  const { agencyId } = await requireAgencyUser("fleet.manage");
  const vehiculos = await listVehicles(agencyId);
  const { editar, error, ok } = await searchParams;
  const editarParsed = z.string().uuid().safeParse(editar);
  const vehiculo = editarParsed.success
    ? vehiculos.find((v) => v.id === editarParsed.data)
    : undefined;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Vehículos</h1>

      <PanelFeedback error={editar ? undefined : error} ok={ok ? OK_LABELS[ok] : undefined} />

      <section className="overflow-x-auto rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-[var(--color-borde)] text-[var(--color-texto-suave)]">
            <tr>
              <th className="px-4 py-3 font-medium">Placa</th>
              <th className="px-4 py-3 font-medium">Modelo</th>
              <th className="px-4 py-3 font-medium">Marca</th>
              <th className="px-4 py-3 font-medium">N° de asientos</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Editar</th>
            </tr>
          </thead>
          <tbody>
            {vehiculos.map((v) => {
              const href = `/panel/vehiculos?editar=${v.id}`;
              return (
                <ClickableRow
                  key={v.id}
                  href={href}
                  selected={v.id === vehiculo?.id}
                  className="border-b border-[var(--color-borde)] last:border-0"
                >
                  <td className="tabular px-4 py-3">{v.plate}</td>
                  <td className="px-4 py-3">{v.model}</td>
                  <td className="px-4 py-3">{v.brand}</td>
                  <td className="tabular px-4 py-3">{v.seatCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        v.active ? "text-[var(--color-exito)]" : "text-[var(--color-texto-suave)]"
                      }`}
                    >
                      {v.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={href}
                      scroll={false}
                      className="rounded-md border border-[var(--color-borde)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-acento-suave)]"
                    >
                      Editar
                    </Link>
                  </td>
                </ClickableRow>
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

      {vehiculo ? (
        <SidePanel
          title={`Editar vehículo ${vehiculo.plate}`}
          closeHref="/panel/vehiculos"
        >
          <form action={updateVehicleAction} className="flex flex-col gap-4">
            <PanelFeedback error={error} />
            <input type="hidden" name="vehicleId" value={vehiculo.id} />
            <div className="flex flex-col gap-1 text-sm font-medium">
              Placa
              <p className="tabular rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)] px-3 py-2 text-sm text-[var(--color-texto-suave)]">
                {vehiculo.plate}
              </p>
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Marca
              <input
                name="brand"
                required
                defaultValue={vehiculo.brand}
                className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Modelo
              <input
                name="model"
                required
                defaultValue={vehiculo.model}
                className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              N° de asientos
              <input
                name="seatCount"
                type="number"
                min={4}
                max={80}
                required
                defaultValue={vehiculo.seatCount}
                className="w-24 rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Estado
              <select
                name="active"
                defaultValue={String(vehiculo.active)}
                className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </label>
            <button
              type="submit"
              className="w-fit rounded-lg bg-[var(--color-acento)] px-5 py-2.5 text-sm font-medium text-white"
            >
              Guardar cambios
            </button>
          </form>
        </SidePanel>
      ) : null}
    </div>
  );
}
