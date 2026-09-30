import Link from "next/link";
import { listBookableDepartures, listOriginsAndDestinations } from "@/modules/catalog";
import { currentPassenger } from "@/modules/auth";
import { buttonClass, Card, SectionTitle } from "@/components/ui";
import { IconChevronRight, IconUser } from "@/components/icons";
import { DepartureBoard } from "@/components/departure-board";
import type { DepartureRowData } from "@/components/departure-row";
import { passengerHref } from "../_publico/links";
import { PortadaSearch } from "./portada-search";
import {
  HERO_ACTION_CLASS,
  HowItWorks,
  PORTADA_COLUMN,
  PORTADA_SEARCH_TITLE,
  PortadaFooter,
  PortadaHero,
} from "./portada-sections";

const SEIS_HORAS_MS = 6 * 60 * 60 * 1000;
const SALIDAS_EN_PORTADA = 6;

export default async function PortadaPage() {
  const now = new Date();

  const [{ origins, destinations }, salidas, pasajero] = await Promise.all([
    listOriginsAndDestinations(),
    listBookableDepartures({ to: new Date(now.getTime() + SEIS_HORAS_MS), onlyWithSeats: true }, now),
    currentPassenger(),
  ]);

  const loggedIn = pasajero !== null;
  const todasLasSalidas = passengerHref("/mi/reservar", loggedIn);
  const hayMasSalidas = salidas.length > SALIDAS_EN_PORTADA;

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
    <div className="min-h-dvh bg-lienzo">
      <main id="contenido">
        <PortadaHero
          action={
            loggedIn ? (
              <Link href="/mi" className={HERO_ACTION_CLASS}>
                <IconUser aria-hidden="true" className="size-5" />
                Mi cuenta
              </Link>
            ) : (
              <Link href="/ingresar" className={HERO_ACTION_CLASS}>
                <IconUser aria-hidden="true" className="size-5" />
                Ingresar
              </Link>
            )
          }
        >
          <PortadaSearch
            title={PORTADA_SEARCH_TITLE}
            origins={origins}
            destinations={destinations}
            loggedIn={loggedIn}
          />
        </PortadaHero>

        <div className={`${PORTADA_COLUMN} flex flex-col gap-8 py-8`}>
          <HowItWorks />

          <section aria-labelledby="proximas-salidas" className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <SectionTitle
                id="proximas-salidas"
                action={
                  hayMasSalidas ? (
                    <Link
                      href={todasLasSalidas}
                      className="foco -mr-2 inline-flex min-h-11 items-center gap-0.5 rounded-pastilla px-3 text-marca-700 transition-colors duration-150 ease-out hover:bg-marca-50 motion-reduce:transition-none"
                    >
                      Ver todas las salidas
                      <IconChevronRight aria-hidden="true" className="size-4" />
                    </Link>
                  ) : null
                }
              >
                Próximas salidas
              </SectionTitle>
              <p className="text-sm text-tinta-suave">
                Salen en las próximas 6 horas y todavía tienen puestos. Toca una para reservar.
              </p>
            </div>
            <DepartureBoard
              departures={salidasVM}
              now={now}
              limit={SALIDAS_EN_PORTADA}
              hrefFor={(id) => passengerHref(`/mi/reservar?departureId=${encodeURIComponent(id)}`, loggedIn)}
              emptyTitle="No hay salidas en las próximas 6 horas"
              emptyDescription="Puede que haya salidas más tarde o en otros días. Búscalas y reserva con tiempo."
              emptyAction={
                <Link href={todasLasSalidas} className={buttonClass("secundario")}>
                  Ver salidas de otros días
                </Link>
              }
            />
          </section>

          {loggedIn ? null : (
            <section aria-labelledby="primera-vez">
              <Card className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h2 id="primera-vez" className="text-lg font-semibold text-tinta">
                    ¿Primera vez aquí?
                  </h2>
                  <p className="text-base leading-relaxed text-tinta-suave">
                    Crea tu cuenta con tu cédula. Así reservas, pagas y guardas tus tickets en un
                    solo lugar.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link href="/registro" className={buttonClass("secundario", "w-full sm:w-auto")}>
                    Crear mi cuenta
                  </Link>
                  <Link href="/ingresar" className={buttonClass("fantasma", "w-full sm:w-auto")}>
                    Ya tengo cuenta
                  </Link>
                </div>
              </Card>
            </section>
          )}
        </div>
      </main>

      <PortadaFooter />
    </div>
  );
}
