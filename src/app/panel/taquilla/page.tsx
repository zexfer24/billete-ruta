import Link from "next/link";
import { requireAgencyUser } from "@/modules/auth";
import { listCounterOptions } from "@/modules/counter";
import { getCurrentDepartureTax } from "@/modules/catalog";
import { EmptyState, PanelPageHeader, panelButtonClass } from "@/components/panel-ui";
import { IconCash, IconCalendar } from "@/components/icons";
import CounterSaleForm, { type DepartureOption, type PaymentMethodOption } from "./counter-sale-form";
import { TAQUILLA_DESCRIPTION } from "./texts";
import { perPassengerPrice } from "./price";

export const metadata = { title: "Taquilla" };

/** Venta en el mostrador: elige salida, titular, acompañantes y cobra en efectivo. */
export default async function TaquillaPage() {
  const { agencyId } = await requireAgencyUser("sales.counter");
  const now = new Date();
  const [{ departures, paymentMethods }, tasa] = await Promise.all([
    listCounterOptions(agencyId),
    // Sin tasa configurada la tarjeta muestra solo la tarifa; el cobro del
    // paso 4 avisa del problema con su propio mensaje.
    getCurrentDepartureTax(now).catch(() => null),
  ]);

  const departureOptions: DepartureOption[] = departures.map((d) => ({
    id: d.id,
    routeName: d.routeName,
    origin: d.origin,
    destination: d.destination,
    departsAtIso: d.departsAt.toISOString(),
    available: d.available,
    fareUsd: d.fareUsd.toString(),
    price: tasa ? perPassengerPrice(d.fareUsd, tasa) : null,
  }));

  const paymentMethodOptions: PaymentMethodOption[] = paymentMethods.map((m) => ({
    id: m.id,
    name: m.name,
    currency: m.currency,
    rateFromUsd: m.rateFromUsd,
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* En el teléfono la frase de ayuda se oculta: el Stepper ya dice que son
          cuatro pasos y así las salidas aparecen antes en la primera pantalla. */}
      <PanelPageHeader
        title="Taquilla"
        description={<span className="hidden sm:inline">{TAQUILLA_DESCRIPTION}</span>}
      />

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
            nowIso={now.toISOString()}
          />
        </div>
      )}
    </div>
  );
}
