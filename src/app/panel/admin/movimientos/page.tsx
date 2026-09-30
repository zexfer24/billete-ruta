import type { Metadata } from "next";
import { Suspense } from "react";
import { IconChevronDown, IconDownload } from "@/components/icons";
import { PANEL_LABEL_CLASS, PanelPageHeader, panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { listAgencies } from "@/modules/agencies";
import { requirePanelUser } from "@/modules/auth";
import { PeriodFilter } from "../_shared/period-filter";
import { rangeKey, resolveAdminRange } from "../_shared/period";
import { TableSkeleton } from "../_shared/skeletons";
import { movementsCsvHref, movementsHref, parseMovementsParams } from "./movements";
import { MovementsList } from "./movements-list";
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
        extraFields={
          <label className={`${PANEL_LABEL_CLASS} min-w-56 flex-1 sm:flex-none`}>
            Agencia
            <span className="relative block">
              <select
                name="agency"
                defaultValue={agencyId ?? ""}
                className={panelInputClass("cursor-pointer appearance-none pr-10 sm:w-64")}
              >
                <option value="">Todas las agencias</option>
                {agencies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.active ? "" : " (inactiva)"}
                  </option>
                ))}
              </select>
              <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-tinta-suave" />
            </span>
          </label>
        }
      />

      <Suspense key={`${rangeKey(range)}|${agencyId ?? "todas"}`} fallback={<TableSkeleton rows={8} columns={8} />}>
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

