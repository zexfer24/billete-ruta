import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import {
  getCurrentDepartureTax,
  getCurrentExchangeRate,
  listActivePaymentMethods,
  listBookableDepartures,
  listOriginsAndDestinations,
} from "@/modules/catalog";
import { listDocuments } from "@/modules/accounts";
import { requirePassenger } from "@/modules/auth";
import { formatCaracasDateTime24 } from "@/lib/time";
import { buttonClass, EmptyState } from "@/components/ui";
import { IconBus } from "@/components/icons";
import BookingForm, { type DepartureVM, type PaymentMethodVM } from "./booking-form";

export const metadata: Metadata = {
  title: "Reservar un viaje",
};

/** Parámetros de la URL: se ignoran los que vengan mal en vez de romper la pantalla. */
const paramsSchema = z.object({
  departureId: z.string().max(64).optional().catch(undefined),
  pasajeros: z.coerce.number().int().min(1).max(6).optional().catch(undefined),
  origen: z.string().max(120).optional().catch(undefined),
  destino: z.string().max(120).optional().catch(undefined),
});

export default async function ReservarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const pasajero = await requirePassenger();
  const parsed = paramsSchema.safeParse(await searchParams);
  const params = parsed.success ? parsed.data : {};
  const now = new Date();

  const [salidas, origenesDestinos, tasaSalida, documentos, tasaVes, tasaCop] = await Promise.all([
    listBookableDepartures({ onlyWithSeats: false }, now),
    listOriginsAndDestinations(),
    getCurrentDepartureTax(),
    listDocuments(pasajero.id),
    getCurrentExchangeRate("VES", now),
    getCurrentExchangeRate("COP", now),
  ]);

  const departures: DepartureVM[] = salidas.map((s) => ({
    id: s.id,
    routeId: s.routeId,
    routeName: s.routeName,
    agencyId: s.agencyId,
    agencyName: s.agencyName,
    origin: s.origin,
    destination: s.destination,
    meetingPoint: s.meetingPoint,
    estimatedMinutes: s.estimatedMinutes,
    departsAtIso: s.departsAt.toISOString(),
    departsAtLabel: formatCaracasDateTime24(s.departsAt),
    fareUsd: s.fareUsd.toFixed(2),
    capacity: s.capacity,
    available: s.available,
    unitLabel: s.unitLabel ?? null,
  }));

  const agenciasUnicas = [...new Set(departures.map((d) => d.agencyId))];
  const metodosPorAgencia = await Promise.all(
    agenciasUnicas.map((agencyId) => listActivePaymentMethods(agencyId)),
  );
  const paymentMethodsByAgency: Record<string, PaymentMethodVM[]> = {};
  agenciasUnicas.forEach((agencyId, indice) => {
    paymentMethodsByAgency[agencyId] = metodosPorAgencia[indice]!.map((m) => ({
      id: m.id,
      agencyId: m.agencyId,
      name: m.name,
      kind: m.kind,
      currency: m.currency,
      details: m.details as unknown as PaymentMethodVM["details"],
      sortOrder: m.sortOrder,
    }));
  });

  const exchangeRates: Partial<Record<"VES" | "COP", string>> = {};
  if (tasaVes) exchangeRates.VES = tasaVes.toFixed(6);
  if (tasaCop) exchangeRates.COP = tasaCop.toFixed(6);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Reservar un viaje</h1>
        <p className="leading-relaxed text-tinta-suave">
          Cuatro pasos: eliges la salida, dices quiénes viajan, aceptas las condiciones y eliges
          cómo pagar.
        </p>
      </div>

      {departures.length === 0 ? (
        <EmptyState
          icon={<IconBus />}
          title="No hay salidas disponibles por ahora"
          description="Las agencias todavía no han programado salidas. Vuelve a mirar más tarde."
          action={
            <Link href="/mi" className={buttonClass("secundario")}>
              Volver al inicio
            </Link>
          }
        />
      ) : (
        <BookingForm
          departures={departures}
          origins={origenesDestinos.origins}
          destinations={origenesDestinos.destinations}
          paymentMethodsByAgency={paymentMethodsByAgency}
          taxPerPassengerUsd={tasaSalida.toFixed(2)}
          exchangeRates={exchangeRates}
          passenger={{ fullName: pasajero.fullName, birthYear: pasajero.birthYear }}
          documents={{
            hasIdDocument: documentos.some((doc) => doc.type === "CEDULA"),
            hasTravelPermit: documentos.some((doc) => doc.type === "PERMISO_VIAJE"),
          }}
          initialOrigin={params.origen}
          initialDestination={params.destino}
          initialDepartureId={params.departureId}
          initialPassengerCount={params.pasajeros}
          nowIso={now.toISOString()}
        />
      )}
    </div>
  );
}
