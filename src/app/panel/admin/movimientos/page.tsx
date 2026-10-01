import type { Metadata } from "next";
import { Suspense } from "react";
import { PanelPageHeader } from "@/components/panel-ui";
import { listAgencies } from "@/modules/agencies";
import { requirePanelUser } from "@/modules/auth";
import { PeriodFilter } from "../_shared/period-filter";
import { rangeKey, resolveAdminRange } from "../_shared/period";
import { AgencySelect } from "./agency-select";
import { movementsHref, parseMovementsParams } from "./movements";
import { MovementsList, MovementsListSkeleton } from "./movements-list";
import { TripDetailPanel, TripDetailPanelSkeleton } from "./trip-detail";

export const metadata: Metadata = { title: "Movimientos de las agencias" };

/**
 * Movimientos de todas las agencias: periodo y agencia en una barra, la lista
 * de viajes (con su descarga junto al total, porque baja lo filtrado) y, con
 * `?viaje=`, el panel lateral con el detalle y los pasajeros a bordo.
 * La lista y el panel tienen su propio `<Suspense>`: abrir un viaje no vuelve
 * a cargar la lista.
 */
export default async function MovimientosAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePanelUser("terminal.dashboard");
  const params = parseMovementsParams(await searchParams);
  const range = resolveAdminRange(params);
  const agencies = await listAgencies();

  // Una agencia que no existe se ignora y se muestran todas.
  const agency = agencies.find((a) => a.id === params.agency);
  const agencyId = agency?.id;

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader
        title="Movimientos de las agencias"
        description="Cada viaje de las agencias del terminal: cuándo embarcó, salió y llegó, y cuántos pasajeros llevó. Toca un viaje para ver quién iba a bordo."
      />

      <PeriodFilter
        path="/panel/admin/movimientos"
        range={range}
        keep={{ agency: agencyId }}
        autoSubmit
        extraFields={
          // Sin `key`: la lista es controlada y toma sola la agencia aplicada
          // (atrás del navegador); volver a montarla le quitaba el foco.
          <AgencySelect agencies={agencies} value={agencyId} />
        }
      />

      <Suspense key={`${rangeKey(range)}|${agencyId ?? "todas"}`} fallback={<MovementsListSkeleton />}>
        <MovementsList range={range} agencyId={agencyId} agencyName={agency?.name} selectedTrip={params.viaje} />
      </Suspense>

      {params.viaje ? (
        <Suspense
          key={params.viaje}
          fallback={<TripDetailPanelSkeleton closeHref={movementsHref(range, agencyId)} />}
        >
          <TripDetailPanel
            tripLogId={params.viaje}
            panelUserId={user.id}
            closeHref={movementsHref(range, agencyId)}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

