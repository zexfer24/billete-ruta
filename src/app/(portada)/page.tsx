import Link from "next/link";
import { listBookableDepartures, listOriginsAndDestinations } from "@/modules/catalog";
import { currentPassenger } from "@/modules/auth";
import { buttonClass, Card, SectionTitle } from "@/components/ui";
import { IconUser } from "@/components/icons";
import { DepartureBoard } from "@/components/departure-board";
import type { DepartureRowData } from "@/components/departure-row";
import { passengerHref } from "../_publico/links";
import { PortadaSearch } from "./portada-search";
import {
  HERO_ACTION_CLASS,
  HowItWorks,
  PORTADA_COLUMN,
  PORTADA_SEARCH_TITLE,
  PORTADA_UPCOMING_HINT,
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
              <SectionTitle id="proximas-salidas">Próximas salidas</SectionTitle>
              <p className="text-sm text-tinta-suave">{PORTADA_UPCOMING_HINT}</p>
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
            {/*
              Siempre hay un camino a las salidas de más tarde y de otros días,
              al pie de la lista, donde lo busca quien no encontró su destino.
              Con la lista vacía ya lo ofrece el estado vacío.
            */}
            {salidasVM.length > 0 ? (
              <Link href={todasLasSalidas} className={buttonClass("secundario", "w-full sm:w-auto sm:self-start")}>
                Ver todas las salidas
              </Link>
            ) : null}
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
                {/* Quien ya tiene cuenta ingresa desde la cabecera: aquí solo va crearla. */}
                <Link href="/registro" className={buttonClass("secundario", "w-full sm:w-auto sm:self-start")}>
                  Crear mi cuenta
                </Link>
              </Card>
            </section>
          )}
        </div>
      </main>

      <PortadaFooter />
    </div>
  );
}
