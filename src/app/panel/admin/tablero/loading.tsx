import { SkeletonScreen } from "@/components/skeleton";
import { ADMIN_PERIOD_TAB_LABELS } from "../_shared/period";
import { LineSkeleton, PageHeaderSkeleton, TabsSkeleton } from "../_shared/skeletons";
import { ADMIN_TABS_BESIDE_TITLE_CLASS, ADMIN_TITLE_ROW_CLASS } from "../_shared/tab-classes";
import { PERIOD_TITLE, PeriodDataSkeleton } from "./period-data";
import { LiveTaxSkeleton, RecurringCardSkeleton } from "./top-cards";

/**
 * Silueta del tablero del terminal, en el mismo orden que la página: arriba
 * la tasa en vivo y los usuarios recurrentes; debajo el periodo, sus cifras,
 * las listas y el gráfico. Los textos fijos (títulos, frases, pestañas de
 * periodo, enlaces) se pintan reales; solo las cifras van en barras.
 */
export default function TableroAdminLoading() {
  return (
    <SkeletonScreen label="Cargando el tablero del terminal…" className="flex flex-col gap-6">
      <PageHeaderSkeleton
        title="Tablero del terminal"
        description="Lo que pasa en el terminal con todas las agencias: la tasa de salida cobrada, los viajes y los pasajeros nuevos."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LiveTaxSkeleton />
        </div>
        <RecurringCardSkeleton />
      </div>

      <div className="flex flex-col gap-3">
        <div aria-hidden="true" className={ADMIN_TITLE_ROW_CLASS}>
          <p className="text-lg font-semibold text-tinta">{PERIOD_TITLE.text}</p>
          <div className={ADMIN_TABS_BESIDE_TITLE_CLASS}>
            <TabsSkeleton labels={ADMIN_PERIOD_TAB_LABELS} grid />
          </div>
        </div>
        <LineSkeleton />
      </div>

      <PeriodDataSkeleton />
    </SkeletonScreen>
  );
}
