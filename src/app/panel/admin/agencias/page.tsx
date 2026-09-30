import type { Metadata } from "next";
import Link from "next/link";
import { AgencyBadge } from "@/components/agency-badge";
import { IconBuilding, IconPlus } from "@/components/icons";
import { PanelFeedback } from "@/components/panel-feedback";
import {
  EmptyState,
  MobileCard,
  PANEL_TD_CLASS,
  PANEL_TH_CLASS,
  PanelPageHeader,
  StatusBadge,
  TableShell,
  panelButtonClass,
} from "@/components/panel-ui";
import { SidePanel } from "@/components/side-panel";
import { cx } from "@/components/ui-classes";
import { listAgencies } from "@/modules/agencies";
import { requirePanelUser } from "@/modules/auth";
import { countLabel, formatCount } from "../_shared/format";
import { AgencyForm } from "./agency-form";
import { AgencyStatusAction } from "./agency-status-action";

export const metadata: Metadata = { title: "Agencias del terminal" };

const PAGE_PATH = "/panel/admin/agencias";
const REGISTER_HREF = `${PAGE_PATH}?registrar=agencia`;

/**
 * Textos de los códigos `?ok=` que devuelven las acciones de esta página. Es
 * un `Map` para que una clave heredada (`?ok=constructor`) no cuele un texto.
 */
const OK_LABELS = new Map<string, string>([
  ["agencia-creada", "Agencia registrada. Su operador ya puede entrar al panel con el correo y la contraseña que le diste."],
  ["agencia-activada", "Agencia activada. Sus salidas vuelven a venderse en la app y en la taquilla."],
  ["agencia-desactivada", "Agencia desactivada. Sus salidas ya no se venden; las reservas que tenía se mantienen."],
]);

function first(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Agencias del terminal: su flota, su personal y su estado. Registrar una
 * agencia abre un panel lateral (`?registrar=agencia`); desactivarla pide
 * confirmación. Los avisos siguen el patrón `?ok=<código>` / `?error=`.
 */
export default async function AgenciasAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePanelUser("terminal.agencies");
  const params = await searchParams;
  const registrar = first(params.registrar) === "agencia";
  const error = first(params.error)?.slice(0, 300);
  const okCode = first(params.ok);
  const ok = okCode ? OK_LABELS.get(okCode) : undefined;

  const agencies = await listAgencies();
  const activeCount = agencies.filter((a) => a.active).length;

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader
        title="Agencias del terminal"
        description="Las agencias que venden pasajes en el terminal, con su flota y su personal. Aquí registras una agencia nueva o la desactivas."
        actions={
          <Link href={REGISTER_HREF} scroll={false} className={panelButtonClass("primario")}>
            <IconPlus className="size-5 shrink-0" />
            Registrar agencia
          </Link>
        }
      />

      <PanelFeedback error={registrar ? undefined : error} ok={ok} />

      {agencies.length === 0 ? (
        <EmptyState
          icon={<IconBuilding />}
          title="Aún no hay agencias registradas"
          description="Registra la primera agencia con su operador. Después ella podrá cargar sus rutas, vehículos y choferes."
          action={
            <Link href={REGISTER_HREF} scroll={false} className={panelButtonClass("secundario")}>
              Registrar la primera agencia
            </Link>
          }
        />
      ) : (
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
                    title={a.name}
                    subtitle={`RIF ${a.taxId}`}
                    status={
                      <StatusBadge label={a.active ? "Activa" : "Inactiva"} tone={a.active ? "exito" : "neutro"} />
                    }
                    details={[
                      { label: "Teléfono", value: a.contactPhone },
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
                  <th scope="col" className={PANEL_TH_CLASS}>
                    Agencia
                  </th>
                  <th scope="col" className={PANEL_TH_CLASS}>
                    Contacto
                  </th>
                  <th scope="col" className={PANEL_TH_CLASS}>
                    Flota
                  </th>
                  <th scope="col" className={PANEL_TH_CLASS}>
                    Personal con acceso
                  </th>
                  <th scope="col" className={PANEL_TH_CLASS}>
                    Estado
                  </th>
                  <th scope="col" className={PANEL_TH_CLASS}>
                    <span className="sr-only">Acción</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {agencies.map((a) => (
                  <tr key={a.id} className="border-b border-borde align-top last:border-0">
                    <td className={PANEL_TD_CLASS}>
                      <div className="flex items-center gap-3">
                        <AgencyBadge agencyId={a.id} name={a.name} size="sm" />
                        <div className="min-w-0">
                          <span className="block font-semibold">{a.name}</span>
                          <span className="tabular block text-sm text-tinta-suave">RIF {a.taxId}</span>
                        </div>
                      </div>
                    </td>
                    <td className={PANEL_TD_CLASS}>
                      <span className="tabular block">{a.contactPhone}</span>
                      <span className="block break-all text-sm text-tinta-suave">{a.contactEmail}</span>
                    </td>
                    <td className={cx(PANEL_TD_CLASS, "tabular")}>
                      <span className="block">{countLabel(a._count.routes, "ruta", "rutas")}</span>
                      <span className="block text-sm text-tinta-suave">
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
                              <span className="break-all text-sm text-tinta-suave">{u.email}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className={PANEL_TD_CLASS}>
                      <StatusBadge label={a.active ? "Activa" : "Inactiva"} tone={a.active ? "exito" : "neutro"} />
                    </td>
                    <td className={PANEL_TD_CLASS}>
                      {/* flex y no text-right: el texto del diálogo de confirmación no debe heredar la alineación. */}
                      <div className="flex justify-end">
                        <AgencyStatusAction
                          agency={{ id: a.id, name: a.name, active: a.active, routes: a._count.routes }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </div>
      )}

      {registrar ? (
        <SidePanel
          title="Registrar agencia"
          subtitle="Se crea la agencia junto con la cuenta de su primer operador."
          closeHref={PAGE_PATH}
        >
          <AgencyForm error={error} closeHref={PAGE_PATH} />
        </SidePanel>
      ) : null}
    </div>
  );
}
