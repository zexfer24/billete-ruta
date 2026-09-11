import Link from "next/link";
import { z } from "zod";
import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { listDrivers } from "@/modules/agencies";
import { SidePanel } from "@/components/side-panel";
import { ClickableRow } from "@/components/clickable-row";
import { createDriverAction, updateDriverAction } from "../flota/actions";

export default async function ChoferesPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string }>;
}) {
  const user = await requirePanelUser("fleet.manage");
  const agencyId = requireAgencyScope(user);
  const choferes = await listDrivers(agencyId);
  const { editar } = await searchParams;
  const editarParsed = z.string().uuid().safeParse(editar);
  const chofer = editarParsed.success
    ? choferes.find((c) => c.id === editarParsed.data)
    : undefined;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Choferes</h1>

      <section className="overflow-x-auto rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-[var(--color-borde)] text-[var(--color-texto-suave)]">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">C.I.</th>
              <th className="px-4 py-3 font-medium">Embarques</th>
              <th className="px-4 py-3 font-medium">Desembarques</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Editar</th>
            </tr>
          </thead>
          <tbody>
            {choferes.map((c) => {
              const href = `/panel/choferes?editar=${c.id}`;
              return (
                <ClickableRow
                  key={c.id}
                  href={href}
                  selected={c.id === chofer?.id}
                  className="border-b border-[var(--color-borde)] last:border-0"
                >
                  <td className="px-4 py-3">{c.fullName}</td>
                  {/* La C.I. va completa: el chofer es personal de la propia agencia, que registró ese dato. */}
                  <td className="tabular px-4 py-3">{c.idNumber}</td>
                  <td className="tabular px-4 py-3">{c.boardingCount}</td>
                  <td className="tabular px-4 py-3">{c.arrivalCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.active ? "text-[var(--color-exito)]" : "text-[var(--color-texto-suave)]"
                      }`}
                    >
                      {c.active ? "Activo" : "Inactivo"}
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

      {chofer ? (
        <SidePanel
          title={`Editar chofer ${chofer.fullName}`}
          subtitle={`C.I. ${chofer.idNumber}`}
          closeHref="/panel/choferes"
        >
          <form action={updateDriverAction} className="flex flex-col gap-4">
            <input type="hidden" name="driverId" value={chofer.id} />
            <label className="flex flex-col gap-1 text-sm font-medium">
              Nombre completo
              <input
                name="fullName"
                required
                defaultValue={chofer.fullName}
                className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Teléfono
              <input
                name="phone"
                required
                defaultValue={chofer.phone}
                className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Estado
              <select
                name="active"
                defaultValue={String(chofer.active)}
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
