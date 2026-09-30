import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { Alert } from "@/components/alert";
import { IconSearch } from "@/components/icons";
import { PANEL_LABEL_CLASS, PanelPageHeader, panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { requirePanelUser } from "@/modules/auth";
import { cleanSearch, pageFromParam } from "../_shared/format";
import { UsersResults, UsersResultsSkeleton } from "./users-results";

export const metadata: Metadata = { title: "Base de datos de usuarios" };

/** Parámetros de la URL. Nunca lanza: una página no numérica o un valor repetido caen al valor por defecto. */
const searchParamsSchema = z.object({
  q: z.string().optional().catch(undefined),
  page: z.string().optional().catch(undefined),
});

/**
 * Base de datos de cuentas de pasajero, con búsqueda y páginas de 25. Es la
 * única pantalla con la cédula completa: cada consulta queda auditada en
 * `listAccounts`, como antes.
 */
export default async function UsuariosAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePanelUser("terminal.users");
  const parsed = searchParamsSchema.safeParse(await searchParams);
  const params = parsed.success ? parsed.data : {};
  const query = cleanSearch(params.q);
  const page = pageFromParam(params.page);

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader
        title="Base de datos de usuarios"
        description="Las cuentas de pasajero del terminal. Busca a una persona por su cédula, su nombre o su teléfono."
      />

      <Alert tone="alerta" role="none" title="Datos personales">
        Aquí ves la cédula completa y el teléfono de cada pasajero. Cada consulta queda registrada con tu nombre.
      </Alert>

      <form
        method="get"
        role="search"
        className="flex flex-col gap-1.5 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1"
      >
        <label htmlFor="q" className={PANEL_LABEL_CLASS}>
          Buscar por cédula, nombre o teléfono
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            id="q"
            name="q"
            defaultValue={query ?? ""}
            maxLength={80}
            autoComplete="off"
            aria-describedby="q-ayuda"
            className={panelInputClass("min-w-0 flex-1 basis-60")}
          />
          <button type="submit" className={panelButtonClass("primario", "md", "flex-1 sm:flex-none")}>
            <IconSearch className="size-5 shrink-0" />
            Buscar
          </button>
          {query ? (
            <Link href="/panel/admin/usuarios" className={panelButtonClass("fantasma", "md", "flex-1 sm:flex-none")}>
              Limpiar búsqueda
            </Link>
          ) : null}
        </div>
        <p id="q-ayuda" className="text-sm text-tinta-suave">
          Ejemplos: V12345678, María Pérez o 4121234567 (el teléfono, sin el 0 del inicio ni espacios).
        </p>
      </form>

      <Suspense key={`${query ?? ""}|${page}`} fallback={<UsersResultsSkeleton />}>
        <UsersResults query={query} page={page} panelUserId={user.id} />
      </Suspense>
    </div>
  );
}
