import Link from "next/link";
import { IconSearch, IconUsers } from "@/components/icons";
import { EmptyState, MobileCard, TableShell, panelButtonClass } from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import { formatCaracasDate, formatCaracasDateTime24, formatCaracasTime24 } from "@/lib/time";
import { listAccounts } from "@/modules/reports";
import { accountSearchTerm, countLabel, formatCount, formatPhone } from "../_shared/format";
import { ADMIN_TD_CLASS, ADMIN_TH_CLASS, Pagination, TimeCell } from "../_shared/lists";
import { withQuery } from "../_shared/period";
import { LineSkeleton, PaginationSkeleton, TableSkeleton } from "../_shared/skeletons";

const PAGE_SIZE = 25;

/**
 * Cabeceras de la tabla, compartidas con su silueta de carga. El nombre y la
 * cédula van juntos en "Pasajero", como en las tarjetas del teléfono: así la
 * tabla cabe entera desde 768 px, sin columnas escondidas a la derecha.
 */
const USER_COLUMNS = [
  "Pasajero",
  "Teléfono",
  "Año de nacimiento",
  "Viajes pagados",
  "Registro",
  "Último ingreso",
] as const;
const USERS_PATH = "/panel/admin/usuarios";

/**
 * Enlace a la bandeja con los mensajes que recibió esa persona, buscada por
 * su teléfono: responde "¿qué le llegó?" sin tener que copiar el número.
 */
function MessagesLink({ phone }: { phone: string }) {
  return (
    <Link
      href={withQuery("/panel/admin/mensajes", { q: phone })}
      className="foco -ml-2 inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-marca-700 transition-colors duration-150 ease-out hover:bg-marca-50 motion-reduce:transition-none"
    >
      Ver sus mensajes
    </Link>
  );
}

function pageHref(query: string | undefined, page: number): string {
  return withQuery(USERS_PATH, { q: query, page: page > 1 ? String(page) : undefined });
}

/**
 * Resultados de la base de datos de usuarios: tabla en escritorio, tarjetas
 * en móvil y paginación. `listAccounts` registra cada consulta en la
 * auditoría, igual que antes del rediseño.
 */
export async function UsersResults({
  query,
  page,
  panelUserId,
}: {
  query?: string;
  page: number;
  panelUserId: string;
}) {
  const { rows, total, pageSize } = await listAccounts(
    { search: accountSearchTerm(query), page, pageSize: PAGE_SIZE },
    panelUserId,
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (total === 0) {
    return query ? (
      <EmptyState
        icon={<IconSearch />}
        title={`No encontramos a nadie con “${query}”`}
        description="Revisa que la cédula lleve su letra (V12345678) o prueba solo con el apellido."
        action={
          <Link href={USERS_PATH} className={panelButtonClass("secundario")}>
            Ver todas las cuentas
          </Link>
        }
      />
    ) : (
      <EmptyState
        icon={<IconUsers />}
        title="Aún no hay cuentas de pasajero"
        description="Aparecerán aquí cuando los pasajeros se registren en la app o los registren en una taquilla."
      />
    );
  }

  if (rows.length === 0) {
    // La página pedida está más allá de la última (por ejemplo ?page=99).
    return (
      <EmptyState
        icon={<IconSearch />}
        title="Esta página no tiene resultados"
        description={`Hay ${countLabel(totalPages, "página", "páginas")} de resultados.`}
        action={
          <Link href={pageHref(query, 1)} className={panelButtonClass("secundario")}>
            Ir a la primera página
          </Link>
        }
      />
    );
  }

  const firstShown = (page - 1) * pageSize + 1;
  const lastShown = firstShown + rows.length - 1;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-tinta-suave">
        {query
          ? `${countLabel(total, "cuenta encontrada", "cuentas encontradas")} con “${query}”`
          : `${countLabel(total, "cuenta registrada", "cuentas registradas")}, de la más reciente a la más antigua`}
        {totalPages > 1 ? `. Estás viendo de la ${formatCount(firstShown)} a la ${formatCount(lastShown)}.` : "."}
      </p>

      {/* Arriba también, como en Mensajes, para no tener que bajar toda la lista para cambiar de página. */}
      <Pagination
        page={page}
        totalPages={totalPages}
        hrefFor={(p) => pageHref(query, p)}
        label="Páginas, arriba de la lista"
      />

      <TableShell
        mobile={
          // En el teléfono, solo lo esencial para reconocer a la persona: el
          // año de nacimiento y el último ingreso quedan en la tabla de
          // escritorio. Se ven las 25 tarjetas de la página, sin "Ver N más":
          // la lista ya va paginada y plegarla escondía cuentas que
          // "Siguiente" se saltaba (como en Mensajes).
          <ul aria-label="Cuentas de pasajero" className="flex flex-col gap-3">
            {rows.map((r) => (
              <MobileCard
                key={r.id}
                title={r.fullName}
                subtitle={
                  <>
                    <span className="block">
                      <span className="tabular whitespace-nowrap">Cédula {r.idNumber}</span> ·{" "}
                      <span className="tabular whitespace-nowrap">{formatPhone(r.phone)}</span>
                    </span>
                    {/* El registro es el orden de la lista: se ve en cada tarjeta. */}
                    <span className="block">
                      <span className="tabular whitespace-nowrap">
                        Registro {formatCaracasDateTime24(r.createdAt)}
                      </span>{" "}
                      ·{" "}
                      <span className="tabular whitespace-nowrap">
                        {countLabel(r.paidTrips, "viaje pagado", "viajes pagados")}
                      </span>
                    </span>
                  </>
                }
                action={<MessagesLink phone={r.phone} />}
              />
            ))}
          </ul>
        }
      >
        <table className="w-full text-left">
          <caption className="sr-only">Cuentas de pasajero</caption>
          <thead>
            <tr className="border-b border-borde">
              {USER_COLUMNS.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className={cx(ADMIN_TH_CLASS, column === "Viajes pagados" && "text-right")}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-borde last:border-0">
                <td className={ADMIN_TD_CLASS}>
                  <span className="block font-semibold">{r.fullName}</span>
                  <span className="tabular block text-sm text-tinta-suave">{r.idNumber}</span>
                </td>
                <td className={cx(ADMIN_TD_CLASS, "whitespace-nowrap")}>
                  <span className="tabular block">{formatPhone(r.phone)}</span>
                  <MessagesLink phone={r.phone} />
                </td>
                <td className={cx(ADMIN_TD_CLASS, "tabular")}>{r.birthYear}</td>
                <td className={cx(ADMIN_TD_CLASS, "tabular text-right")}>{formatCount(r.paidTrips)}</td>
                <td className={ADMIN_TD_CLASS}>
                  <TimeCell time={formatCaracasTime24(r.createdAt)} date={formatCaracasDate(r.createdAt)} />
                </td>
                <td className={ADMIN_TD_CLASS}>
                  {r.lastLoginAt ? (
                    <TimeCell time={formatCaracasTime24(r.lastLoginAt)} date={formatCaracasDate(r.lastLoginAt)} />
                  ) : (
                    <span className="text-tinta-suave">Nunca</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      <Pagination page={page} totalPages={totalPages} hrefFor={(p) => pageHref(query, p)} />
    </div>
  );
}

/** Silueta de los resultados: línea del total, la paginación de arriba y la tabla de 10 filas. */
export function UsersResultsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <LineSkeleton className="w-80" />
      <PaginationSkeleton />
      <TableSkeleton columns={USER_COLUMNS} rows={10} mobileDetails={0} mobileSubtitleLines={2} mobileAction />
    </div>
  );
}
