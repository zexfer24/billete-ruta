import Link from "next/link";
import { AgencyBadge } from "@/components/agency-badge";
import { IconBuilding } from "@/components/icons";
import {
  EmptyState,
  MobileCard,
  PANEL_TD_CLASS,
  PANEL_TH_CLASS,
  StatusBadge,
  TableShell,
  panelButtonClass,
} from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import { listAgencies } from "@/modules/agencies";
import { countLabel, formatCount, formatPhone } from "../_shared/format";
import { LineSkeleton, TableSkeleton } from "../_shared/skeletons";
import { AgencyStatusAction } from "./agency-status-action";

/** Cabeceras de la tabla de agencias; la última es la de la acción, sin título visible. */
const AGENCY_COLUMNS = ["Agencia", "Contacto", "Flota", "Personal con acceso", "Estado", ""] as const;

/**
 * Lista de agencias: el total, la tabla en escritorio y las tarjetas en
 * móvil. Va en su propio `<Suspense>` para que el panel lateral de registro,
 * que no necesita datos, se abra sin esperar esta consulta.
 */
export async function AgenciesList({ registerHref }: { registerHref: string }) {
  const agencies = await listAgencies();
  const activeCount = agencies.filter((a) => a.active).length;

  if (agencies.length === 0) {
    return (
      <EmptyState
        icon={<IconBuilding />}
        title="Aún no hay agencias registradas"
        description="Registra la primera agencia con su operador. Después ella podrá cargar sus rutas, vehículos y choferes."
        action={
          <Link href={registerHref} scroll={false} className={panelButtonClass("secundario")}>
            Registrar la primera agencia
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-tinta-suave">
        {countLabel(agencies.length, "agencia registrada", "agencias registradas")}
        {activeCount === agencies.length
          ? agencies.length === 1
            ? ", activa."
            : ", todas activas."
          : `, ${countLabel(activeCount, "activa", "activas")}.`}
      </p>

      <TableShell
        mobile={
          <ul aria-label="Agencias" className="flex flex-col gap-3">
            {agencies.map((a) => (
              <MobileCard
                key={a.id}
                title={
                  <span className="flex items-center gap-2">
                    <AgencyBadge agencyId={a.id} name={a.name} size="sm" decorative />
                    <span className="min-w-0">{a.name}</span>
                  </span>
                }
                subtitle={`RIF ${a.taxId}`}
                status={<StatusBadge label={a.active ? "Activa" : "Inactiva"} tone={a.active ? "exito" : "neutro"} />}
                details={[
                  { label: "Teléfono", value: formatPhone(a.contactPhone) },
                  { label: "Rutas", value: formatCount(a._count.routes) },
                  { label: "Vehículos", value: formatCount(a._count.vehicles) },
                  { label: "Choferes", value: formatCount(a._count.drivers) },
                ]}
                action={
                  <AgencyStatusAction
                    agency={{ id: a.id, name: a.name, active: a.active, routes: a._count.routes }}
                    size="md"
                    fullWidth
                  />
                }
              />
            ))}
          </ul>
        }
      >
        <table className="w-full min-w-[56rem] text-left">
          <caption className="sr-only">Agencias del terminal</caption>
          <thead>
            <tr className="border-b border-borde">
              {AGENCY_COLUMNS.map((column, index) => (
                <th key={index} scope="col" className={cx(PANEL_TH_CLASS, "whitespace-nowrap")}>
                  {column || <span className="sr-only">Acción</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agencies.map((a) => (
              <tr key={a.id} className="border-b border-borde align-top last:border-0">
                <td className={PANEL_TD_CLASS}>
                  <div className="flex items-center gap-3">
                    <AgencyBadge agencyId={a.id} name={a.name} size="sm" decorative />
                    <div className="min-w-0">
                      <span className="block font-semibold">{a.name}</span>
                      <span className="tabular block whitespace-nowrap text-sm text-tinta-suave">RIF {a.taxId}</span>
                    </div>
                  </div>
                </td>
                <td className={PANEL_TD_CLASS}>
                  <span className="tabular block whitespace-nowrap">{formatPhone(a.contactPhone)}</span>
                  {/* break-words y no break-all: el correo solo se parte si de verdad no cabe. */}
                  <span className="block break-words text-sm text-tinta-suave">{a.contactEmail}</span>
                </td>
                <td className={cx(PANEL_TD_CLASS, "tabular")}>
                  <span className="block whitespace-nowrap">{countLabel(a._count.routes, "ruta", "rutas")}</span>
                  <span className="block whitespace-nowrap text-sm text-tinta-suave">
                    {countLabel(a._count.vehicles, "vehículo", "vehículos")} ·{" "}
                    {countLabel(a._count.drivers, "chofer", "choferes")}
                  </span>
                </td>
                <td className={PANEL_TD_CLASS}>
                  {a.panelUsers.length === 0 ? (
                    <span className="text-tinta-suave">Nadie todavía</span>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {a.panelUsers.map((u) => (
                        <li key={u.id} className="flex flex-col">
                          <span className="flex flex-wrap items-center gap-2">
                            {u.name}
                            {u.active ? null : <StatusBadge label="Sin acceso" tone="neutro" />}
                          </span>
                          <span className="break-words text-sm text-tinta-suave">{u.email}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className={cx(PANEL_TD_CLASS, "whitespace-nowrap")}>
                  <StatusBadge label={a.active ? "Activa" : "Inactiva"} tone={a.active ? "exito" : "neutro"} />
                </td>
                <td className={PANEL_TD_CLASS}>
                  {/* flex y no text-right: el texto del diálogo de confirmación no debe heredar la alineación. */}
                  <div className="flex justify-end">
                    <AgencyStatusAction agency={{ id: a.id, name: a.name, active: a.active, routes: a._count.routes }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}

/** Silueta de la lista de agencias: el total y la tabla con sus cabeceras reales. */
export function AgenciesListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <LineSkeleton className="w-60" />
      <TableSkeleton columns={AGENCY_COLUMNS} rows={4} mobileCards={3} mobileStatus mobileAction />
    </div>
  );
}
