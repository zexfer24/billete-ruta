import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { listDrivers } from "@/modules/agencies";
import { maskIdNumber } from "@/lib/identity";
import { createDriverAction, updateDriverAction } from "../flota/actions";

export default async function ChoferesPage() {
  const user = await requirePanelUser("fleet.manage");
  const agencyId = requireAgencyScope(user);
  const choferes = await listDrivers(agencyId);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Choferes</h1>

      <section className="overflow-x-auto rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-[var(--color-borde)] text-[var(--color-texto-suave)]">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Cédula</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Embarques</th>
              <th className="px-4 py-3 font-medium">Desembarques</th>
              <th className="px-4 py-3 font-medium">Editar</th>
            </tr>
          </thead>
          <tbody>
            {choferes.map((c) => {
              const formId = `drv-${c.id}`;
              return (
                <tr key={c.id} className="border-b border-[var(--color-borde)] last:border-0">
                  <td className="px-4 py-3">
                    <input
                      form={formId}
                      name="fullName"
                      defaultValue={c.fullName}
                      className="w-40 rounded-md border border-[var(--color-borde)] bg-[var(--color-fondo)] px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="tabular px-4 py-3">{maskIdNumber(c.idNumber)}</td>
                  <td className="px-4 py-3">
                    <input
                      form={formId}
                      name="phone"
                      defaultValue={c.phone}
                      className="w-32 rounded-md border border-[var(--color-borde)] bg-[var(--color-fondo)] px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="tabular px-4 py-3">{c.boardingCount}</td>
                  <td className="tabular px-4 py-3">{c.arrivalCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        form={formId}
                        name="active"
                        defaultValue={String(c.active)}
                        className="rounded-md border border-[var(--color-borde)] bg-[var(--color-fondo)] px-2 py-1 text-sm"
                      >
                        <option value="true">Activo</option>
                        <option value="false">Inactivo</option>
                      </select>
                      <form id={formId} action={updateDriverAction}>
                        <input type="hidden" name="driverId" value={c.id} />
                        <button
                          type="submit"
                          className="rounded-md bg-[var(--color-acento)] px-3 py-1.5 text-sm font-medium text-white"
                        >
                          Guardar
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {choferes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[var(--color-texto-suave)]">
                  Todavía no hay choferes registrados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-4 border-t border-[var(--color-borde)] pt-8">
        <h2 className="text-lg font-semibold">Registrar chofer</h2>
        <form action={createDriverAction} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Nombre completo
            <input
              name="fullName"
              required
              className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Cédula
            <input
              name="idNumber"
              required
              className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Teléfono
            <input
              name="phone"
              required
              className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
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
