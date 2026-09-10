import { requirePanelUser } from "@/modules/auth";
import { listAgencies } from "@/modules/agencies";
import { createAgencyAction, toggleAgencyAction } from "./actions";

export default async function AgenciasAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requirePanelUser("terminal.agencies");
  const params = await searchParams;
  const agencies = await listAgencies();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Agencias del terminal</h2>
        <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
          Agencias registradas, su flota y sus usuarios de panel.
        </p>
      </div>

      {params.error && (
        <div className="rounded-xl border border-[var(--color-peligro)] bg-red-50 px-4 py-3 text-sm text-[var(--color-peligro)]">
          {params.error}
        </div>
      )}
      {params.ok && (
        <div className="rounded-xl border border-[var(--color-exito)] bg-green-50 px-4 py-3 text-sm text-[var(--color-exito)]">
          Operación realizada con éxito.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-b border-[var(--color-borde)] text-xs uppercase tracking-wide text-[var(--color-texto-suave)]">
            <tr>
              <th className="px-4 py-3">Agencia</th>
              <th className="px-4 py-3">RIF</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3 text-right">Rutas</th>
              <th className="px-4 py-3 text-right">Vehículos</th>
              <th className="px-4 py-3 text-right">Choferes</th>
              <th className="px-4 py-3">Usuarios de panel</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {agencies.map((a) => (
              <tr key={a.id} className="border-b border-[var(--color-borde)] align-top last:border-0">
                <td className="px-4 py-2 font-medium">{a.name}</td>
                <td className="px-4 py-2 tabular">{a.taxId}</td>
                <td className="px-4 py-2">
                  <p>{a.contactPhone}</p>
                  <p className="text-[var(--color-texto-suave)]">{a.contactEmail}</p>
                </td>
                <td className="px-4 py-2 text-right tabular">{a._count.routes}</td>
                <td className="px-4 py-2 text-right tabular">{a._count.vehicles}</td>
                <td className="px-4 py-2 text-right tabular">{a._count.drivers}</td>
                <td className="px-4 py-2">
                  <ul className="space-y-0.5">
                    {a.panelUsers.map((u) => (
                      <li key={u.id} className={u.active ? "" : "text-[var(--color-texto-suave)] line-through"}>
                        {u.name} <span className="text-[var(--color-texto-suave)]">({u.email})</span>
                      </li>
                    ))}
                    {a.panelUsers.length === 0 && (
                      <li className="text-[var(--color-texto-suave)]">Sin usuarios</li>
                    )}
                  </ul>
                </td>
                <td className="px-4 py-2">
                  {a.active ? (
                    <span className="rounded-full bg-[var(--color-acento-suave)] px-2 py-0.5 text-xs font-medium text-[var(--color-acento)]">
                      Activa
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-[var(--color-peligro)]">
                      Inactiva
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <form action={toggleAgencyAction}>
                    <input type="hidden" name="agencyId" value={a.id} />
                    <input type="hidden" name="active" value={(!a.active).toString()} />
                    <button
                      type="submit"
                      className="rounded-md border border-[var(--color-borde)] px-3 py-1 text-xs font-medium hover:bg-[var(--color-acento-suave)]"
                    >
                      {a.active ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {agencies.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-[var(--color-texto-suave)]">
                  Aún no hay agencias registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5">
        <h3 className="text-lg font-semibold">Nueva agencia</h3>
        <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
          Da de alta una agencia junto con su primer usuario operador.
        </p>
        <form action={createAgencyAction} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-[var(--color-texto-suave)]">
              Nombre de la agencia
            </label>
            <input
              id="name"
              name="name"
              required
              className="mt-1 w-full rounded-md border border-[var(--color-borde)] px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="taxId" className="block text-xs font-medium text-[var(--color-texto-suave)]">
              RIF
            </label>
            <input
              id="taxId"
              name="taxId"
              required
              className="mt-1 w-full rounded-md border border-[var(--color-borde)] px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="contactPhone" className="block text-xs font-medium text-[var(--color-texto-suave)]">
              Teléfono de contacto
            </label>
            <input
              id="contactPhone"
              name="contactPhone"
              required
              placeholder="+58412..."
              className="mt-1 w-full rounded-md border border-[var(--color-borde)] px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="contactEmail" className="block text-xs font-medium text-[var(--color-texto-suave)]">
              Correo de contacto
            </label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              required
              className="mt-1 w-full rounded-md border border-[var(--color-borde)] px-3 py-1.5 text-sm"
            />
          </div>
          <div className="border-t border-[var(--color-borde)] pt-3 sm:col-span-2">
            <p className="text-sm font-medium">Primer operador</p>
          </div>
          <div>
            <label htmlFor="operatorName" className="block text-xs font-medium text-[var(--color-texto-suave)]">
              Nombre del operador
            </label>
            <input
              id="operatorName"
              name="operatorName"
              required
              className="mt-1 w-full rounded-md border border-[var(--color-borde)] px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="operatorEmail" className="block text-xs font-medium text-[var(--color-texto-suave)]">
              Correo del operador
            </label>
            <input
              id="operatorEmail"
              name="operatorEmail"
              type="email"
              required
              className="mt-1 w-full rounded-md border border-[var(--color-borde)] px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="operatorPassword" className="block text-xs font-medium text-[var(--color-texto-suave)]">
              Contraseña inicial
            </label>
            <input
              id="operatorPassword"
              name="operatorPassword"
              type="password"
              required
              minLength={8}
              className="mt-1 w-full rounded-md border border-[var(--color-borde)] px-3 py-1.5 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-[var(--color-acento)] px-4 py-2 text-sm font-medium text-white"
            >
              Crear agencia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
