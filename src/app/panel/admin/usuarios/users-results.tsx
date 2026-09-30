import Link from "next/link";
import { IconSearch, IconUsers } from "@/components/icons";
import {
  EmptyState,
  MobileCard,
  PANEL_TD_CLASS,
  PANEL_TH_CLASS,
  TableShell,
  panelButtonClass,
} from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import { formatCaracasDate, formatCaracasTime24 } from "@/lib/time";
import { listAccounts } from "@/modules/reports";
import { accountSearchTerm, countLabel, formatCount, formatPhone } from "../_shared/format";
import { Pagination, TimeCell } from "../_shared/lists";
import { withQuery } from "../_shared/period";
import { LineSkeleton, TableSkeleton } from "../_shared/skeletons";

const PAGE_SIZE = 25;

/** Cabeceras de la tabla, compartidas con su silueta de carga. */
const USER_COLUMNS = [
  "Cédula",
  "Nombre",
  "Teléfono",
  "Año de nacimiento",
  "Viajes pagados",
  "Registro",
  "Último ingreso",
] as const;
const USERS_PATH = "/panel/admin/usuarios";

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

      <TableShell
        mobile={
          <ul aria-label="Cuentas de pasajero" className="flex flex-col gap-3">
            {rows.map((r) => (
              <MobileCard
                key={r.id}
                title={r.fullName}
                subtitle={`Cédula ${r.idNumber}`}
                details={[
                  { label: "Teléfono", value: formatPhone(r.phone) },
                  { label: "Año de nacimiento", value: r.birthYear },
                  { label: "Viajes pagados", value: formatCount(r.paidTrips) },
                  {
                    label: "Último ingreso",
                    value: r.lastLoginAt ? formatCaracasDate(r.lastLoginAt) : "Nunca",
                  },
                ]}
              />
            ))}
          </ul>
        }
      >
        <table className="w-full min-w-[52rem] text-left">
          <caption className="sr-only">Cuentas de pasajero</caption>
          <thead>
            <tr className="border-b border-borde">
              {USER_COLUMNS.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className={cx(PANEL_TH_CLASS, column === "Viajes pagados" && "text-right")}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-borde last:border-0">
                <td className={cx(PANEL_TD_CLASS, "tabular font-semibold")}>{r.idNumber}</td>
                <td className={PANEL_TD_CLASS}>{r.fullName}</td>
                <td className={cx(PANEL_TD_CLASS, "tabular whitespace-nowrap")}>{formatPhone(r.phone)}</td>
                <td className={cx(PANEL_TD_CLASS, "tabular")}>{r.birthYear}</td>
                <td className={cx(PANEL_TD_CLASS, "tabular text-right")}>{formatCount(r.paidTrips)}</td>
                <td className={PANEL_TD_CLASS}>
                  <TimeCell time={formatCaracasTime24(r.createdAt)} date={formatCaracasDate(r.createdAt)} />
                </td>
                <td className={PANEL_TD_CLASS}>
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

/** Silueta de los resultados: línea del total, tabla de 10 filas y paginación. */
export function UsersResultsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <LineSkeleton className="w-80" />
      <TableSkeleton columns={USER_COLUMNS} rows={10} />
    </div>
  );
}
