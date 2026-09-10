import Link from "next/link";
import { z } from "zod";
import { requirePanelUser } from "@/modules/auth";
import { listAccounts } from "@/modules/reports";
import { formatCaracasDateTime24 } from "@/lib/time";

const searchParamsSchema = z.object({
  q: z.string().optional(),
  page: z.string().regex(/^\d+$/).optional(),
});

const PAGE_SIZE = 25;

function pageHref(query: string | undefined, page: number): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("page", String(page));
  return `/panel/admin/usuarios?${params.toString()}`;
}

export default async function UsuariosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requirePanelUser("terminal.users");
  const rawParams = searchParamsSchema.parse(await searchParams);
  const query = rawParams.q?.trim() || undefined;
  const page = rawParams.page ? Math.max(1, Number.parseInt(rawParams.page, 10)) : 1;

  const { rows, total, pageSize } = await listAccounts({ search: query, page, pageSize: PAGE_SIZE }, user.id);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Base de datos de usuarios</h2>
        <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
          Cuentas de pasajero registradas en el terminal.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--color-alerta)] bg-amber-50 px-4 py-3 text-sm text-[var(--color-alerta)]">
        Esta pantalla muestra información sensible: cédula completa, teléfono y demás datos personales de
        los pasajeros. Es la única pantalla del sistema donde la cédula se muestra sin enmascarar. Cada
        consulta queda registrada en la bitácora de auditoría con el administrador que la realizó y el
        filtro aplicado.
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4"
      >
        <div className="min-w-[240px] flex-1">
          <label htmlFor="q" className="block text-xs font-medium text-[var(--color-texto-suave)]">
            Buscar por cédula, nombre o teléfono
          </label>
          <input
            type="text"
            id="q"
            name="q"
            defaultValue={query ?? ""}
            placeholder="V12345678, María Pérez, +58412..."
            className="mt-1 w-full rounded-md border border-[var(--color-borde)] px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-[var(--color-acento)] px-4 py-1.5 text-sm font-medium text-white"
        >
          Buscar
        </button>
        {query && (
          <Link href="/panel/admin/usuarios" className="text-sm text-[var(--color-texto-suave)] underline">
            Limpiar
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-[var(--color-borde)] text-xs uppercase tracking-wide text-[var(--color-texto-suave)]">
            <tr>
              <th className="px-4 py-3">Cédula</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Año de nacimiento</th>
              <th className="px-4 py-3 text-right">Viajes pagados</th>
              <th className="px-4 py-3">Registro</th>
              <th className="px-4 py-3">Última actividad</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[var(--color-borde)] last:border-0">
                <td className="px-4 py-2 font-medium tabular">{r.idNumber}</td>
                <td className="px-4 py-2">{r.fullName}</td>
                <td className="px-4 py-2 tabular">{r.phone}</td>
                <td className="px-4 py-2 tabular">{r.birthYear}</td>
                <td className="px-4 py-2 text-right tabular">{r.paidTrips}</td>
                <td className="px-4 py-2 tabular">{formatCaracasDateTime24(r.createdAt)}</td>
                <td className="px-4 py-2 tabular">
                  {r.lastLoginAt ? formatCaracasDateTime24(r.lastLoginAt) : "Nunca"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-[var(--color-texto-suave)]">
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--color-texto-suave)]">
        <span>
          {total} cuenta(s) — página {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={pageHref(query, page - 1)} className="rounded-md border border-[var(--color-borde)] px-3 py-1.5">
              Anterior
            </Link>
          )}
          {page < totalPages && (
            <Link href={pageHref(query, page + 1)} className="rounded-md border border-[var(--color-borde)] px-3 py-1.5">
              Siguiente
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
