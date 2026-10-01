import type { Metadata } from "next";
import { Suspense } from "react";
import { IconDownload } from "@/components/icons";
import { PanelPageHeader, panelButtonClass } from "@/components/panel-ui";
import { listAgencies } from "@/modules/agencies";
import { requirePanelUser } from "@/modules/auth";
import { PeriodFilter } from "../_shared/period-filter";
import { rangeKey, resolveAdminRange } from "../_shared/period";
import { AgencySelect } from "./agency-select";
import { movementsCsvHref, movementsHref, parseMovementsParams } from "./movements";
import { MovementsList, MovementsListSkeleton } from "./movements-list";
import { TripDetailPanel, TripDetailPanelSkeleton } from "./trip-detail";

export const metadata: Metadata = { title: "Movimientos de las agencias" };

/**
 * Movimientos de todas las agencias: periodo, agencia, la lista de viajes y,
 * con `?viaje=`, el panel lateral con el detalle y los pasajeros a bordo.
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
        actions={
          <a href={movementsCsvHref(range, agencyId)} download className={panelButtonClass("secundario")}>
            <IconDownload className="size-5 shrink-0" />
            Descargar en Excel (CSV)
          </a>
        }
      />

      <PeriodFilter
        path="/panel/admin/movimientos"
        range={range}
        keep={{ agency: agencyId }}
        autoSubmit
        extraFields={
          // `key`: la lista no es controlada; si la URL cambia de agencia
          // (atrás del navegador), se vuelve a montar con la aplicada.
          <AgencySelect key={agencyId ?? ""} agencies={agencies} value={agencyId} />
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

