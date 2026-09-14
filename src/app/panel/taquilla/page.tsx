import Link from "next/link";
import { requireAgencyUser } from "@/modules/auth";
import { listCounterOptions } from "@/modules/counter";
import { EmptyState, PanelPageHeader, panelButtonClass } from "@/components/panel-ui";
import CounterSaleForm, { type DepartureOption, type PaymentMethodOption } from "./counter-sale-form";

/** Página de venta en el mostrador: elige salida, titular, acompañantes y cobra en efectivo. */
export default async function TaquillaPage() {
  const { agencyId } = await requireAgencyUser("sales.counter");
  const { departures, paymentMethods } = await listCounterOptions(agencyId);

  const departureOptions: DepartureOption[] = departures.map((d) => ({
    id: d.id,
    routeName: d.routeName,
    origin: d.origin,
    destination: d.destination,
    departsAtIso: d.departsAt.toISOString(),
    available: d.available,
    fareUsd: d.fareUsd.toString(),
  }));

  const paymentMethodOptions: PaymentMethodOption[] = paymentMethods.map((m) => ({
    id: m.id,
    name: m.name,
    currency: m.currency,
    rateFromUsd: m.rateFromUsd,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader
        title="Taquilla"
        description="Vende un pasaje en el mostrador. El cobro es en efectivo y el ticket se emite en el acto. Horas en formato de 24 horas, hora de Caracas."
      />

      {paymentMethodOptions.length === 0 ? (
        <EmptyState
          title="El terminal no tiene métodos de pago en efectivo activos."
          description="Pide al administrador que active uno."
        />
      ) : departureOptions.length === 0 ? (
        <EmptyState
          title="No hay salidas con cupo en los próximos 7 días."
          action={
            <Link href="/panel/salidas?crear=1" className={panelButtonClass("primario", "sm")}>
              Crear salida
            </Link>
          }
        />
      ) : (
        <div className="max-w-3xl">
          <CounterSaleForm departures={departureOptions} paymentMethods={paymentMethodOptions} />
        </div>
      )}
    </div>
  );
}
