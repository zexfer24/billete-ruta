import { IconLive, IconTicket } from "@/components/icons";
import { StatCard } from "@/components/panel-ui";
import { Skeleton } from "@/components/skeleton";
import { Pill } from "@/components/ui";
import { formatMoney } from "@/lib/decimal";
import { recurringAccounts, type departureTaxRevenue } from "@/modules/reports";
import { formatCount } from "../_shared/format";
import { StatCardSkeleton } from "../_shared/skeletons";
import { LiveTaxCard } from "./live-tax";

/**
 * Cifras de arriba del tablero, las que no dependen del periodo elegido: la
 * tasa de salida en vivo y los usuarios recurrentes. Cada una va en su propio
 * `<Suspense>` sin clave, fuera del bloque del periodo: la página ya no espera
 * sus consultas antes de pintarse, y cambiar de periodo no las reemplaza por
 * su silueta.
 */

type DepartureTax = Awaited<ReturnType<typeof departureTaxRevenue>>;

/**
 * Tasa en vivo. Recibe la consulta ya iniciada por la página (sin `await`),
 * para que corra al mismo tiempo que el resto del tablero.
 */
export async function LiveTax({ tax, generatedAt }: { tax: Promise<DepartureTax>; generatedAt: Date }) {
  const value = await tax;
  return (
    <LiveTaxCard
      initial={{
        totalUsd: formatMoney(value.totalUsd, "USD"),
        reservations: value.reservations,
        passengers: value.passengers,
        generatedAt: generatedAt.toISOString(),
      }}
    />
  );
}

/**
 * Silueta de la tarjeta en vivo: su título, su frase y "En vivo" son fijos y
 * se pintan reales; solo las cifras van en barras.
 */
export function LiveTaxSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-full flex-col gap-4 overflow-hidden rounded-tarjeta border border-marca-200 bg-superficie p-5 shadow-1 sm:p-6"
    >
      <span className="absolute inset-x-0 top-0 h-1.5 bg-marca-600" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-tinta">Tasa de salida cobrada</p>
          <p className="text-sm leading-snug text-tinta-suave">
            Últimas 24 horas, de todas las agencias. Se actualiza sola.
          </p>
        </div>
        <div className="shrink-0">
          <Pill tone="exito" icon={<IconLive />}>
            En vivo
          </Pill>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-48 sm:h-12" />
        <Skeleton className="h-5 w-64 max-w-full rounded-pastilla" />
      </div>
      <div className="border-t border-borde pt-3">
        <Skeleton className="h-4 w-40 rounded-pastilla" />
      </div>
    </div>
  );
}

const RECURRING_LABEL = "Usuarios recurrentes";

/** Pasajeros con dos o más viajes pagados, contados desde el inicio. */
export async function RecurringCard() {
  const total = await recurringAccounts();
  return (
    <StatCard
      label={RECURRING_LABEL}
      value={formatCount(total)}
      detail="Pasajeros con dos o más viajes pagados, desde el inicio del sistema."
      icon={<IconTicket />}
      tone="marca"
    />
  );
}

export function RecurringCardSkeleton() {
  return <StatCardSkeleton label={RECURRING_LABEL} />;
}
