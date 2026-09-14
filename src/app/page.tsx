import Link from "next/link";
import { listBookableDepartures, listOriginsAndDestinations } from "@/modules/catalog";
import { currentPassenger } from "@/modules/auth";
import { buttonClass, Card, SectionTitle } from "@/components/ui";
import { IconBus } from "@/components/icons";
import { DepartureBoard } from "@/components/departure-board";
import type { DepartureRowData } from "@/components/departure-row";
import { PortadaSearch } from "./portada-search";

const SEIS_HORAS_MS = 6 * 60 * 60 * 1000;

export default async function PortadaPage() {
  const now = new Date();

  const [{ origins, destinations }, salidas, pasajero] = await Promise.all([
    listOriginsAndDestinations(),
    listBookableDepartures({ to: new Date(now.getTime() + SEIS_HORAS_MS), onlyWithSeats: true }, now),
    currentPassenger(),
  ]);

  const loggedIn = pasajero !== null;

  const salidasVM: DepartureRowData[] = salidas.map((salida) => ({
    id: salida.id,
    agencyId: salida.agencyId,
    agencyName: salida.agencyName,
    origin: salida.origin,
    destination: salida.destination,
    departsAt: salida.departsAt,
    estimatedMinutes: salida.estimatedMinutes,
    fareUsd: salida.fareUsd.toString(),
    available: salida.available,
    capacity: salida.capacity,
  }));

  return (
    <div className="min-h-screen bg-lienzo">
      <div className="bg-marca pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="mx-auto max-w-md px-4 md:max-w-2xl">
          <p className="flex items-center gap-1.5 text-2xl font-extrabold text-white">
            <span className="h-2 w-2 rounded-full bg-cta" aria-hidden="true" />
            TicketRuta
          </p>
          <h1 className="mt-4 text-3xl font-extrabold text-white md:text-4xl">
            Reserva tu pasaje en el terminal
          </h1>
          <p className="mt-2 text-white/80">
            Identidad verificada, pago con comprobante y ticket digital con QR
          </p>
          <IconBus aria-hidden="true" width={80} height={80} className="mt-4 text-white/25" />
          <div className="mt-6">
            <PortadaSearch origins={origins} destinations={destinations} loggedIn={loggedIn} />
          </div>
        </div>
      </div>

      <main className="mx-auto flex max-w-md flex-col gap-3 px-4 py-6 md:max-w-2xl">
        <SectionTitle>Próximas salidas</SectionTitle>
        <DepartureBoard
          departures={salidasVM}
          now={now}
          limit={6}
          hrefFor={(id) =>
            loggedIn
              ? `/mi/reservar?departureId=${id}`
              : `/ingresar?next=${encodeURIComponent(`/mi/reservar?departureId=${id}`)}`
          }
        />

        <Card className="mt-3 flex flex-col gap-3">
          {loggedIn ? (
            <Link href="/mi" className={buttonClass("primario", "w-full")}>
              Ir a mi cuenta
            </Link>
          ) : (
            <>
              <Link href="/ingresar" className={buttonClass("secundario", "w-full")}>
                Ingresar con mi cédula
              </Link>
              <Link href="/registro" className={buttonClass("fantasma", "w-full")}>
                Crear cuenta
              </Link>
            </>
          )}
          <Link href="/panel/ingresar" className="text-center text-sm text-tinta-suave">
            Acceso del personal
          </Link>
        </Card>
      </main>
    </div>
  );
}
