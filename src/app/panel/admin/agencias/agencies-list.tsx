import Link from "next/link";
import { AgencyBadge } from "@/components/agency-badge";
import { IconBuilding } from "@/components/icons";
import { EmptyState, MobileCard, StatusBadge, TableShell, panelButtonClass } from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import { prisma } from "@/lib/prisma";
import { listAgencies } from "@/modules/agencies";
import { OCCUPYING_STATUSES } from "@/modules/booking";
import { countLabel, formatPhone } from "../_shared/format";
import { ADMIN_TD_CLASS, ADMIN_TH_CLASS } from "../_shared/lists";
import { LineSkeleton, TableSkeleton, skeletonColumns } from "../_shared/skeletons";
import { AgencyStatusAction } from "./agency-status-action";

/**
 * Cabeceras de la tabla de agencias; la última es la de la acción, sin título
 * visible. El estado va como pastilla bajo el nombre, no en su propia
 * columna, para que la tabla quepa entera desde 768 px (con la barra lateral,
 * a 1024 px quedan unos 686 px) sin esconder «Desactivar» a la derecha.
 */
const AGENCY_COLUMNS = ["Agencia", "Contacto", "Flota", "Personal con acceso", ""] as const;

type AgencyRow = Awaited<ReturnType<typeof listAgencies>>[number];

/** "3 rutas · 3 vehículos · 3 choferes", la flota en una línea que puede partirse entre datos. */
function fleetParts(a: AgencyRow): string[] {
  return [
    countLabel(a._count.routes, "ruta", "rutas"),
    countLabel(a._count.vehicles, "vehículo", "vehículos"),
    countLabel(a._count.drivers, "chofer", "choferes"),
  ];
}

function AgencyStatus({ active }: { active: boolean }) {
  return <StatusBadge label={active ? "Activa" : "Inactiva"} tone={active ? "exito" : "neutro"} />;
}

/**
 * Correo con un punto de corte después de la arroba: si no cabe en la línea,
 * baja el dominio entero en vez de partirlo a mitad de palabra
 * ("contacto@losandes.te" / "st"). `className` decide qué pasa si una de las
 * dos partes aún no cabe: `break-words` en las tarjetas, `wrap-anywhere` en
 * la tabla (para no ensancharla).
 */
function EmailText({ email, className }: { email: string; className: string }) {
  const at = email.indexOf("@");
  if (at < 0) return <span className={className}>{email}</span>;
  return (
    <span className={className}>
      {email.slice(0, at + 1)}
      <wbr />
      {email.slice(at + 1)}
    </span>
  );
}

/**
 * Personal con acceso al panel de la agencia: nombre y correo con que entra.
 * El correo parte donde haga falta (`wrap-anywhere`) para no ensanchar la
 * tabla, primero por la arroba.
 */
function StaffList({ users }: { users: AgencyRow["panelUsers"] }) {
  if (users.length === 0) return <span className="text-tinta-suave">Nadie todavía</span>;
  return (
    <ul className="flex flex-col gap-1.5">
      {users.map((u) => (
        <li key={u.id} className="flex min-w-0 flex-col">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {u.name}
            {u.active ? null : <StatusBadge label="Sin acceso" tone="neutro" />}
          </span>
          <EmailText email={u.email} className="text-sm text-tinta-suave wrap-anywhere" />
        </li>
      ))}
    </ul>
  );
}

/**
 * Reservas que siguen ocupando un puesto en salidas futuras de cada agencia
 * activa, para decir en el diálogo de desactivar cuánta gente queda por
 * atender. Una sola consulta para todas: las salidas futuras de las agencias
 * activas con el conteo de sus reservas que ocupan puesto, sumado por agencia.
 */
async function upcomingReservationsByAgency(agencies: AgencyRow[], now: Date): Promise<Map<string, number>> {
  const activeIds = agencies.filter((a) => a.active).map((a) => a.id);
  const counts = new Map<string, number>(activeIds.map((id) => [id, 0]));
  if (activeIds.length === 0) return counts;
  const departures = await prisma.departure.findMany({
    where: { departsAt: { gt: now }, route: { agencyId: { in: activeIds } } },
    select: {
      route: { select: { agencyId: true } },
      _count: { select: { reservations: { where: { status: { in: [...OCCUPYING_STATUSES] } } } } },
    },
  });
  for (const d of departures) {
    counts.set(d.route.agencyId, (counts.get(d.route.agencyId) ?? 0) + d._count.reservations);
  }
  return counts;
}

/**
 * Lista de agencias: el total, la tabla en escritorio y las tarjetas en
 * móvil. Va en su propio `<Suspense>` para que el panel lateral de registro,
 * que no necesita datos, se abra sin esperar esta consulta.
 */
export async function AgenciesList({ registerHref }: { registerHref: string }) {
  const agencies = await listAgencies();
  const activeCount = agencies.filter((a) => a.active).length;
  const upcoming = await upcomingReservationsByAgency(agencies, new Date());
  const statusAgency = (a: AgencyRow) => ({
    id: a.id,
    name: a.name,
    active: a.active,
    routes: a._count.routes,
    upcomingReservations: upcoming.get(a.id) ?? 0,
  });

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
                subtitle={
                  <>
                    <span className="tabular">RIF {a.taxId}</span>
                    <span className="block">{fleetParts(a).join(" · ")}</span>
                  </>
                }
                status={<AgencyStatus active={a.active} />}
                action={
                  <div className="flex w-full flex-col gap-3">
                    {/* El contacto ocupa todo el ancho de la tarjeta: en media
                        columna el correo no cabía y se partía a mitad del dominio. */}
                    <div className="flex flex-col gap-1">
                      <p className="text-sm text-tinta-suave">Contacto</p>
                      {/* Como en el personal: el dato principal (el teléfono) en
                          negrita y el correo en texto secundario. */}
                      <div className="flex flex-col">
                        <span className="tabular whitespace-nowrap text-[15px] font-medium text-tinta">
                          {formatPhone(a.contactPhone)}
                        </span>
                        <EmailText email={a.contactEmail} className="break-words text-sm text-tinta-suave" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 border-t border-borde pt-3">
                      <p className="text-sm text-tinta-suave">Personal con acceso</p>
                      <div className="text-[15px] font-medium text-tinta">
                        <StaffList users={a.panelUsers} />
                      </div>
                    </div>
                    <AgencyStatusAction agency={statusAgency(a)} size="md" fullWidth />
                  </div>
                }
              />
            ))}
          </ul>
        }
      >
        {/* `relative`: la cabecera "Acción" solo para lectores de pantalla es
            absoluta y, sin un antepasado posicionado dentro del marco, se salía
            de él y ensanchaba la página. */}
        <table className="relative w-full text-left">
          <caption className="sr-only">Agencias del terminal</caption>
          <thead>
            <tr className="border-b border-borde">
              {AGENCY_COLUMNS.map((column, index) => (
                <th key={index} scope="col" className={ADMIN_TH_CLASS}>
                  {column || <span className="sr-only">Acción</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agencies.map((a) => (
              <tr key={a.id} className="border-b border-borde align-top last:border-0">
                <td className={ADMIN_TD_CLASS}>
                  <div className="flex items-start gap-3">
                    <AgencyBadge agencyId={a.id} name={a.name} size="sm" decorative />
                    <div className="flex min-w-0 flex-col items-start gap-1">
                      <span className="block font-semibold">{a.name}</span>
                      <span className="tabular block text-sm text-tinta-suave">
                        RIF <span className="whitespace-nowrap">{a.taxId}</span>
                      </span>
                      <AgencyStatus active={a.active} />
                    </div>
                  </div>
                </td>
                <td className={ADMIN_TD_CLASS}>
                  <span className="tabular block whitespace-nowrap">{formatPhone(a.contactPhone)}</span>
                  <EmailText email={a.contactEmail} className="block text-sm text-tinta-suave wrap-anywhere" />
                </td>
                <td className={cx(ADMIN_TD_CLASS, "tabular")}>
                  {fleetParts(a).map((part, index) => (
                    <span key={index} className={cx("block", index > 0 && "text-sm text-tinta-suave")}>
                      {part}
                    </span>
                  ))}
                </td>
                <td className={ADMIN_TD_CLASS}>
                  <StaffList users={a.panelUsers} />
                </td>
                <td className={ADMIN_TD_CLASS}>
                  {/* flex y no text-right: el texto del diálogo de confirmación no debe heredar la alineación. */}
                  <div className="flex justify-end">
                    <AgencyStatusAction agency={statusAgency(a)} />
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

/**
 * Celdas de la tabla en la silueta: la agencia con su bloque de color, nombre,
 * RIF y estado; el contacto en dos líneas; la flota en tres; una persona del
 * personal con su correo; y el botón de activar o desactivar.
 */
const AGENCY_SKELETON_COLUMNS = skeletonColumns(AGENCY_COLUMNS, [
  { lines: ["w-36", "w-28"], badge: true, pill: true },
  { lines: ["w-32", "w-44"] },
  { lines: ["w-16", "w-20", "w-20"] },
  { lines: ["w-32", "w-44"] },
  { kind: "action" },
]);

/** Silueta de la lista de agencias: el total y la tabla con sus cabeceras reales. */
export function AgenciesListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <LineSkeleton className="w-60" />
      <TableSkeleton
        columns={AGENCY_SKELETON_COLUMNS}
        rows={4}
        mobileCards={3}
        mobileDetails={0}
        mobileSubtitleLines={2}
        mobileTextLines={3}
        mobileStatus
        mobileAction
      />
    </div>
  );
}
