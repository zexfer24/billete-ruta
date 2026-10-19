import type { ReactNode } from "react";
import { AgencyBadge } from "@/components/agency-badge";
import { IconBuilding, IconBus, IconCash, IconMapPin, IconTicket } from "@/components/icons";
import { EmptyState, StatCard } from "@/components/panel-ui";
import { formatMoney } from "@/lib/decimal";
import type { PassengerProfile } from "@/modules/reports";
import { formatCount } from "../../_shared/format";
import { ProfileCard, ProfileSection } from "./profile-section";
import { topCountText } from "./profile-format";

/**
 * Las cinco cifras, en dos columnas en el teléfono y en cinco desde `xl`. Entre
 * `lg` y `xl` la barra lateral del panel deja poco ancho, así que se quedan en
 * dos columnas para que la etiqueta y el icono no se recorten. El total pagado
 * ocupa el ancho entero salvo en cinco columnas (y ahí una columna más ancha),
 * porque es la única cifra con signo de moneda y miles.
 */
export const SUMMARY_GRID_CLASS =
  "grid grid-cols-2 gap-3 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.5fr)]";
export const SUMMARY_LAST_CELL_CLASS = "col-span-2 xl:col-span-1";

function Cell({ children, className }: { children: ReactNode; className?: string }) {
  return <li className={`min-w-0 [&>*]:h-full ${className ?? ""}`}>{children}</li>;
}

export function ProfileStats({ summary }: { summary: PassengerProfile["summary"] }) {
  return (
    <section aria-labelledby="resumen-titulo">
      <h2 id="resumen-titulo" className="sr-only">
        Resumen de viajes
      </h2>
      <ul className={SUMMARY_GRID_CLASS}>
        <Cell>
          <StatCard label="Tickets pagados" value={formatCount(summary.paidTickets)} icon={<IconTicket />} />
        </Cell>
        <Cell>
          <StatCard label="Viajes realizados" value={formatCount(summary.completedTrips)} icon={<IconBus />} />
        </Cell>
        <Cell>
          <StatCard
            label="Destinos distintos"
            value={formatCount(summary.distinctDestinations)}
            icon={<IconMapPin />}
          />
        </Cell>
        <Cell>
          <StatCard label="Agencias" value={formatCount(summary.distinctAgencies)} icon={<IconBuilding />} />
        </Cell>
        <Cell className={SUMMARY_LAST_CELL_CLASS}>
          <StatCard
            label="Total pagado"
            value={<span className="text-2xl [overflow-wrap:anywhere]">{formatMoney(summary.totalPaidUsd, "USD")}</span>}
            icon={<IconCash />}
          />
        </Cell>
      </ul>
    </section>
  );
}

function CountRow({ children, count }: { children: ReactNode; count: number }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-borde py-2.5 last:border-0">
      <span className="flex min-w-0 items-center gap-2.5 text-[15px] font-medium text-tinta">{children}</span>
      <span className="tabular shrink-0 text-sm text-tinta-suave">{topCountText(count)}</span>
    </li>
  );
}

/** Destinos y agencias que más usa, con su conteo alineado a la derecha. */
export function ProfileFrequent({ summary }: { summary: PassengerProfile["summary"] }) {
  const { topDestinations, topAgencies } = summary;
  const empty = topDestinations.length === 0 && topAgencies.length === 0;

  return (
    <ProfileSection id="frecuente" title="Lo más frecuente">
      {empty ? (
        <EmptyState icon={<IconBus />} title="Todavía no tiene viajes." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ProfileCard>
            <h3 className="text-base font-semibold text-tinta">Destinos</h3>
            <ul aria-label="Destinos más frecuentes" className="mt-1 flex flex-col">
              {topDestinations.map((destination) => (
                <CountRow key={destination.name} count={destination.count}>
                  <span className="min-w-0 break-words">{destination.name}</span>
                </CountRow>
              ))}
            </ul>
          </ProfileCard>
          <ProfileCard>
            <h3 className="text-base font-semibold text-tinta">Agencias</h3>
            <ul aria-label="Agencias más frecuentes" className="mt-1 flex flex-col">
              {topAgencies.map((agency) => (
                <CountRow key={agency.id} count={agency.count}>
                  <AgencyBadge agencyId={agency.id} name={agency.name} size="sm" decorative />
                  <span className="min-w-0 break-words">{agency.name}</span>
                </CountRow>
              ))}
            </ul>
          </ProfileCard>
        </div>
      )}
    </ProfileSection>
  );
}
