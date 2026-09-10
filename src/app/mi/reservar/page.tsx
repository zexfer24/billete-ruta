import { getCurrentDepartureTax, listActivePaymentMethods } from "@/modules/catalog";
import { listBookableDepartures, listOriginsAndDestinations } from "@/modules/catalog";
import { requirePassenger } from "@/modules/auth";
import { formatCaracasDateTime24 } from "@/lib/time";
import BookingForm, {
  type DepartureVM,
  type PaymentMethodVM,
} from "./booking-form";

export default async function ReservarPage({
  searchParams,
}: {
  searchParams: Promise<{ departureId?: string; pasajeros?: string }>;
}) {
  const pasajero = await requirePassenger();
  const params = await searchParams;

  const [salidas, origenesDestinos, tasaSalida] = await Promise.all([
    listBookableDepartures({ onlyWithSeats: false }),
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
  }));

  const agenciasUnicas = [...new Set(departures.map((d) => d.agencyId))];
  const paymentMethodsByAgency: Record<string, PaymentMethodVM[]> = {};
  for (const agencyId of agenciasUnicas) {
    const metodos = await listActivePaymentMethods(agencyId);
    paymentMethodsByAgency[agencyId] = metodos.map((m) => ({
      id: m.id,
      agencyId: m.agencyId,
      name: m.name,
      kind: m.kind,
      currency: m.currency,
      details: m.details as unknown as PaymentMethodVM["details"],
      sortOrder: m.sortOrder,
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reservar un puesto</h1>
        <p className="mt-1 text-[var(--color-texto-suave)]">
          Elige tu salida, agrega a tus acompañantes y paga o abona en línea.
        </p>
      </div>

      {departures.length === 0 ? (
        <p className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 py-3 text-sm text-[var(--color-texto-suave)]">
          No hay salidas disponibles por ahora. Vuelve a intentarlo más tarde.
        </p>
      ) : (
        <BookingForm
          departures={departures}
          origins={origenesDestinos.origins}
          destinations={origenesDestinos.destinations}
          paymentMethodsByAgency={paymentMethodsByAgency}
          taxPerPassengerUsd={tasaSalida.toString()}
          passenger={{ fullName: pasajero.fullName, birthYear: pasajero.birthYear }}
          initialDepartureId={params.departureId}
          initialPassengerCount={
            params.pasajeros ? Number.parseInt(params.pasajeros, 10) : undefined
          }
        />
      )}
    </div>
  );
}
