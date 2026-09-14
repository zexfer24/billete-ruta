import { getCurrentDepartureTax, listActivePaymentMethods } from "@/modules/catalog";
import { listBookableDepartures, listOriginsAndDestinations } from "@/modules/catalog";
import { requirePassenger } from "@/modules/auth";
import { formatCaracasDateTime24 } from "@/lib/time";
import { Card } from "@/components/ui";
import BookingForm, { type DepartureVM, type PaymentMethodVM } from "./booking-form";

export default async function ReservarPage({
  searchParams,
}: {
  searchParams: Promise<{ departureId?: string; pasajeros?: string; origen?: string; destino?: string }>;
}) {
  const pasajero = await requirePassenger();
  const params = await searchParams;
  const now = new Date();

  const [salidas, origenesDestinos, tasaSalida] = await Promise.all([
    listBookableDepartures({ onlyWithSeats: false }, now),
    listOriginsAndDestinations(),
    getCurrentDepartureTax(),
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
    fareUsd: s.fareUsd.toString(),
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-tinta">Reservar un puesto</h1>
        <p className="mt-1 text-tinta-suave">Elige tu salida, agrega a tus acompañantes y paga o abona en línea.</p>
      </div>

      {departures.length === 0 ? (
        <Card className="text-sm text-tinta-suave">No hay salidas disponibles por ahora. Vuelve a intentarlo más tarde.</Card>
      ) : (
        <BookingForm
          departures={departures}
          origins={origenesDestinos.origins}
          destinations={origenesDestinos.destinations}
          paymentMethodsByAgency={paymentMethodsByAgency}
          taxPerPassengerUsd={tasaSalida.toString()}
          passenger={{ fullName: pasajero.fullName, birthYear: pasajero.birthYear }}
          initialOrigin={params.origen}
          initialDestination={params.destino}
          initialDepartureId={params.departureId}
          initialPassengerCount={params.pasajeros ? Number.parseInt(params.pasajeros, 10) : undefined}
          nowIso={now.toISOString()}
        />
      )}
    </div>
  );
}
