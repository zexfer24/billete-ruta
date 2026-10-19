import Link from "next/link";
import { IconSearch, IconUsers } from "@/components/icons";
import { EmptyState, MobileCard, TableShell, panelButtonClass } from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import { formatCaracasDate, formatCaracasTime24 } from "@/lib/time";
import { listAccounts } from "@/modules/reports";
import { accountSearchTerm, countLabel, formatCount, formatPhone } from "../_shared/format";
import { ADMIN_TD_CLASS, ADMIN_TH_CLASS, DatePhrase, DotParts, Pagination, TimeCell } from "../_shared/lists";
import { withQuery } from "../_shared/period";
import { LineSkeleton, PaginationSkeleton, TableSkeleton, skeletonColumns } from "../_shared/skeletons";

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

/** Celdas de la tabla en la silueta: nombre y cédula, teléfono con su enlace, cifras y horas con su fecha. */
const USER_SKELETON_COLUMNS = skeletonColumns(USER_COLUMNS, [
  { lines: ["w-40", "w-20"] },
  { lines: ["w-32", "w-28"] },
  { lines: ["w-10"] },
  { lines: ["w-6"], align: "right" },
  { lines: ["w-12", "w-20"] },
  { lines: ["w-12", "w-20"] },
]);

/**
 * Enlace a la bandeja con los mensajes que recibió esa persona, buscada por
 * su teléfono: responde "¿qué le llegó?" sin tener que copiar el número. El
 * nombre va solo para el lector de pantalla ("Ver sus mensajes de María
 * Pérez"), como "Editar" en Flota: en la lista de enlaces se sabe de quién es
 * cada uno.
 *
 * El teléfono viaja en `?q=`, como la cédula o el nombre en la búsqueda de
 * esta misma pantalla: la bandeja lo busca y deja la consulta en la bitácora.
 */
function MessagesLink({ phone, name }: { phone: string; name: string }) {
  return (
    <Link
      href={withQuery("/panel/admin/mensajes", { q: phone })}
      className="foco -ml-2 inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-marca-700 transition-colors duration-150 ease-out hover:bg-marca-50 motion-reduce:transition-none"
    >
      Ver sus mensajes<span className="sr-only"> de {name}</span>
    </Link>
  );
}

/**
 * Nombre de la persona como enlace a su perfil interno. En la tabla y en la
 * tarjeta del teléfono: es la forma más natural de abrir una ficha.
 */
function ProfileLink({ id, name }: { id: string; name: string }) {
  return (
    <Link
      href={`${USERS_PATH}/${id}`}
      className="foco rounded-control font-semibold text-marca-700 underline-offset-2 hover:underline"
    >
      {name}
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

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-tinta-suave">
        {query
          ? `${countLabel(total, "cuenta encontrada", "cuentas encontradas")} con “${query}”`
          : `${countLabel(total, "cuenta registrada", "cuentas registradas")}, de la más reciente a la más antigua`}
.
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
                title={<ProfileLink id={r.id} name={r.fullName} />}
                subtitle={
                  <>
                    {/* Cada dato entero (`DotParts`): si la línea no cabe, se parte
                        antes de un punto, nunca a mitad de una fecha. */}
                    <span className="tabular block">
                      <DotParts parts={[`Cédula ${r.idNumber}`, formatPhone(r.phone)]} />
                    </span>
                    {/* El registro es el orden de la lista: se ve en cada tarjeta,
                        con la misma frase que en el tablero. */}
                    <span className="tabular block">
                      <DotParts
                        parts={[
                          <DatePhrase key="registro" lead="Se registró" date={r.createdAt} />,
                          countLabel(r.paidTrips, "viaje pagado", "viajes pagados"),
                        ]}
                      />
                    </span>
                  </>
                }
                action={<MessagesLink phone={r.phone} name={r.fullName} />}
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
                  <span className="block">
                    <ProfileLink id={r.id} name={r.fullName} />
                  </span>
                  <span className="tabular block text-sm text-tinta-suave">{r.idNumber}</span>
                </td>
                <td className={cx(ADMIN_TD_CLASS, "whitespace-nowrap")}>
                  <span className="tabular block">{formatPhone(r.phone)}</span>
                  <MessagesLink phone={r.phone} name={r.fullName} />
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
      <TableSkeleton
        columns={USER_SKELETON_COLUMNS}
        rows={10}
        mobileDetails={0}
        mobileSubtitleLines={2}
        mobileAction
      />
    </div>
  );
}
