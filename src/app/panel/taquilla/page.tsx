import Link from "next/link";
import { requireAgencyUser } from "@/modules/auth";
import { listCounterOptions } from "@/modules/counter";
import { EmptyState, PanelPageHeader, panelButtonClass } from "@/components/panel-ui";
import { IconCash, IconCalendar } from "@/components/icons";
import CounterSaleForm, { type DepartureOption, type PaymentMethodOption } from "./counter-sale-form";
import { TAQUILLA_DESCRIPTION } from "./texts";

export const metadata = { title: "Taquilla" };

/** Venta en el mostrador: elige salida, titular, acompañantes y cobra en efectivo. */
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
      <PanelPageHeader title="Taquilla" description={TAQUILLA_DESCRIPTION} />

      {paymentMethodOptions.length === 0 ? (
        <EmptyState
          icon={<IconCash />}
          title="Todavía no se puede cobrar en efectivo"
          description="El terminal no tiene activa ninguna forma de pago en efectivo. Avisa al administrador del terminal para que la active; mientras tanto no se puede vender en taquilla."
          action={
            <Link href="/panel" className={panelButtonClass("secundario")}>
              Volver al tablero
            </Link>
          }
        />
      ) : departureOptions.length === 0 ? (
        <EmptyState
          icon={<IconCalendar />}
          title="No hay salidas con puestos libres"
          description="En los próximos 7 días no queda ninguna salida con puestos. Crea una salida para poder vender."
          action={
            <Link href="/panel/salidas?crear=1" className={panelButtonClass("primario")}>
              Crear una salida
            </Link>
          }
        />
      ) : (
        <div className="max-w-3xl">
          <CounterSaleForm
            departures={departureOptions}
            paymentMethods={paymentMethodOptions}
            nowIso={new Date().toISOString()}
          />
        </div>
      )}
    </div>
  );
}
