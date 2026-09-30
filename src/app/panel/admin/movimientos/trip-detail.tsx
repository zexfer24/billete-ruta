import type { ReactNode } from "react";
import { IconUsers } from "@/components/icons";
import { EmptyState, StatusBadge } from "@/components/panel-ui";
import { SidePanel } from "@/components/side-panel";
import { Skeleton, SkeletonText } from "@/components/skeleton";
import { departureStatusLabel, departureStatusTone } from "@/lib/labels";
import { formatCaracasDateTime24, formatCaracasTime24, formatDuration } from "@/lib/time";
import { getTripDetail } from "@/modules/reports";
import { formatCount } from "../_shared/format";
import { AuditNote } from "../_shared/lists";
import { tripStatus } from "./movements";

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 border-b border-borde py-2.5 last:border-0 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-tinta-suave">{label}</dt>
      <dd className="text-[15px] text-tinta">{children}</dd>
    </div>
  );
}

function when(date: Date | null): string {
  return date ? formatCaracasDateTime24(date) : "Sin registrar";
}

/**
 * Panel lateral con el detalle de un viaje y los pasajeros que abordaron.
 * `getTripDetail` deja registro de auditoría, como antes: por eso solo se
 * consulta cuando el administrador abre un viaje.
 */
export async function TripDetailPanel({
  tripLogId,
  panelUserId,
  closeHref,
}: {
  tripLogId: string;
  panelUserId: string;
  closeHref: string;
}) {
  const detail = await getTripDetail(tripLogId, panelUserId);

  if (!detail) {
    return (
      <SidePanel title="No encontramos este viaje" closeHref={closeHref}>
        <EmptyState
          title="El viaje no existe o ya no está disponible"
          description="Cierra este panel y elige otro viaje de la lista."
        />
      </SidePanel>
    );
  }

  const status = tripStatus(detail);

  return (
    <SidePanel
      title={`${detail.origin} → ${detail.destination}`}
      subtitle={`${detail.agencyName} · salida programada el ${formatCaracasDateTime24(detail.departsAt)}`}
      closeHref={closeHref}
    >
      <div className="flex flex-col gap-6">
        <div>
          <StatusBadge label={departureStatusLabel(status)} tone={departureStatusTone(status)} />
        </div>

        <dl className="flex flex-col">
          <DetailRow label="Agencia">{detail.agencyName}</DetailRow>
          <DetailRow label="Ruta">
            {detail.routeName}
            <span className="block text-sm text-tinta-suave">
              {detail.origin} → {detail.destination}
            </span>
          </DetailRow>
          <DetailRow label="Punto de encuentro">{detail.meetingPoint}</DetailRow>
          <DetailRow label="Chofer">
            {detail.driverName}
            <span className="tabular block text-sm text-tinta-suave">Cédula {detail.driverIdNumber}</span>
          </DetailRow>
          <DetailRow label="Unidad">
            <span className="tabular">{detail.vehiclePlate}</span>
            <span className="block text-sm text-tinta-suave">
              {detail.vehicleBrand} {detail.vehicleModel}
            </span>
          </DetailRow>
          <DetailRow label="Embarque">
            <span className="tabular">{when(detail.boardingStartedAt)}</span>
          </DetailRow>
          <DetailRow label="Salida">
            <span className="tabular">{when(detail.departedAt)}</span>
          </DetailRow>
          <DetailRow label="Llegada">
            <span className="tabular">{when(detail.arrivedAt)}</span>
          </DetailRow>
          <DetailRow label="Duración">
            <span className="tabular">
              {detail.durationMinutes !== null ? formatDuration(detail.durationMinutes) : "Todavía no llega"}
            </span>
          </DetailRow>
        </dl>

        <section aria-labelledby="pasajeros-a-bordo-titulo" className="flex flex-col gap-3">
          <h3 id="pasajeros-a-bordo-titulo" className="text-base font-semibold text-tinta">
            Pasajeros a bordo ({formatCount(detail.passengers.length)})
          </h3>
          {detail.passengers.length === 0 ? (
            <EmptyState
              icon={<IconUsers />}
              title="Todavía no hay pasajeros a bordo"
              description="Aparecen aquí a medida que la agencia confirma el abordaje de cada uno."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {detail.passengers.map((p) => (
                <li key={p.id} className="flex flex-col gap-2 rounded-control border border-borde p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-tinta">{p.fullName}</p>
                    {p.isHolder ? <StatusBadge label="Titular" tone="marca" /> : null}
                  </div>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-tinta-suave">Cédula</dt>
                      <dd className="tabular font-medium text-tinta">{p.idNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-tinta-suave">Código del ticket</dt>
                      <dd className="tabular break-all font-medium text-tinta">{p.reservationCode}</dd>
                    </div>
                    <div>
                      <dt className="text-tinta-suave">Abordó</dt>
                      <dd className="tabular font-medium text-tinta">{formatCaracasTime24(p.boardedAt)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </section>

        <AuditNote>Esta consulta quedó registrada con tu nombre, porque muestra datos personales.</AuditNote>
      </div>
    </SidePanel>
  );
}

/** Silueta del panel lateral mientras se consulta el viaje. */
export function TripDetailPanelSkeleton({ closeHref }: { closeHref: string }) {
  return (
    <SidePanel title="Cargando el viaje…" closeHref={closeHref}>
      <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-6">
        <span className="sr-only">Cargando el detalle del viaje…</span>
        <Skeleton className="h-7 w-40 rounded-pastilla" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="grid grid-cols-1 gap-1 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <Skeleton className="h-4 w-24 rounded-pastilla" />
              <Skeleton className="h-4 w-3/5 rounded-pastilla" />
            </div>
          ))}
        </div>
        <SkeletonText lines={1} />
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
    </SidePanel>
  );
}
