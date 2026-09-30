import { Suspense } from "react";
import Link from "next/link";
import { requireAgencyUser } from "@/modules/auth";
import { agencyDashboard, agencyFleetStatus, listAgencyActivity, listRecentTickets } from "@/modules/reports";
import { listAgencyDepartures, listRoutes } from "@/modules/catalog";
import { listDrivers, listVehicles } from "@/modules/agencies";
import { countPendingProofs } from "@/modules/payments";
import { firstNamePart } from "@/lib/identity";
import {
  caracasDayRange,
  caracasPeriodRange,
  DASHBOARD_PERIODS,
  DASHBOARD_PERIOD_LABELS,
  formatCaracasTime24,
  periodFromSlug,
  type DashboardPeriod,
} from "@/lib/time";
import { SidePanel } from "@/components/side-panel";
import { PanelFeedback } from "@/components/panel-feedback";
import { SkeletonText } from "@/components/skeleton";
import { IconBus, IconCalendar, IconCash, IconRefresh, IconStore, IconUsers } from "@/components/icons";
import { PanelPageHeader, PanelTabs, panelButtonClass } from "@/components/panel-ui";
import { panelFeedbackUrl } from "@/app/panel/feedback";
import { CashPaymentForm } from "@/app/panel/_forms/cash-payment-form";
import { DepartureForm } from "@/app/panel/_forms/departure-form";
import { VehicleForm } from "@/app/panel/_forms/vehicle-form";
import { DriverForm } from "@/app/panel/_forms/driver-form";
import { AttentionBlock } from "@/app/panel/_dashboard/attention-block";
import { FiguresBlock } from "@/app/panel/_dashboard/figures-block";
import { FleetBlock } from "@/app/panel/_dashboard/fleet-block";
import { TicketsBlock } from "@/app/panel/_dashboard/tickets-block";
import { TripsTodayBlock } from "@/app/panel/_dashboard/trips-today-block";
import { ActivityBlock } from "@/app/panel/_dashboard/activity-block";
import { Collapsible } from "@/app/panel/_dashboard/collapsible";
import {
  AttentionSkeleton,
  FiguresSkeleton,
  ListRowsSkeleton,
  SectionSkeleton,
  TripsTodaySkeleton,
} from "@/app/panel/_dashboard/skeletons";
import {
  ACTIVITY_TITLE,
  activityDescription,
  FLEET_SECTION,
  QUICK_REGISTER_SECTION,
  ticketsSection,
} from "@/app/panel/_dashboard/section-texts";
import { errorMessage, firstParam, okMessage, type RawSearchParam } from "@/app/panel/_dashboard/search-params";

export const metadata = { title: "Tablero" };

/** Traduce el código corto de `?ok=` a un texto. Un código desconocido no muestra nada. */
const OK_LABELS: Record<string, string> = {
  cobro: "Cobro registrado.",
  "cobro-ticket": "Cobro registrado. El saldo quedó en cero y se emitió el ticket.",
  "salida-creada": "Salida creada con éxito.",
  "vehiculo-creado": "Vehículo registrado con éxito.",
  "chofer-creado": "Chofer registrado con éxito.",
};

/** El periodo en palabras, para títulos y frases ("Resumen de hoy"). */
const PERIOD_PHRASES: Record<DashboardPeriod, string> = {
  hoy: "hoy",
  "7d": "los últimos 7 días",
  "30d": "los últimos 30 días",
};

type Registrar = "cobro" | "salida" | "vehiculo" | "chofer";

const REGISTRAR_VALUES: readonly Registrar[] = ["cobro", "salida", "vehiculo", "chofer"];

function registrarFromSlug(slug: string | undefined): Registrar | undefined {
  return REGISTRAR_VALUES.find((valor) => valor === slug);
}

/**
 * Marca la promesa como atendida para que Node no avise de un rechazo sin
 * manejar mientras espera a que su bloque la lea; el bloque que la espera
 * recibe el error igual y lo lleva a la página de error.
 */
function inBackground<T>(promise: Promise<T>): Promise<T> {
  promise.catch(() => undefined);
  return promise;
}

/** Formulario de "Crear salida" del registro rápido: carga rutas, buses y choferes solo al abrirse. */
async function DeparturePanelContent({
  agencyId,
  error,
  errorField,
}: {
  agencyId: string;
  error?: string;
  errorField?: string;
}) {
  const [rutas, vehiculos, choferes] = await Promise.all([
    listRoutes(agencyId),
    listVehicles(agencyId),
    listDrivers(agencyId),
  ]);
  return (
    <DepartureForm
      routes={rutas}
      vehicles={vehiculos.filter((v) => v.active)}
      drivers={choferes.filter((d) => d.active)}
      returnTo="tablero"
      error={error}
      errorField={errorField}
    />
  );
}

/**
 * Tablero del operador (spec 7.2). Arriba lo que necesita atención ahora y
 * las cuatro cifras del periodo; debajo, las salidas del día, la flota, los
 * tickets nuevos y, plegados, la actividad y el registro rápido. Cada bloque
 * carga por su cuenta dentro de su `<Suspense>`: la cabecera y la acción
 * principal aparecen al instante.
 */
export default async function PanelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, RawSearchParam>>;
}) {
  const { user, agencyId } = await requireAgencyUser("agency.reports");
  const params = await searchParams;

  const now = new Date();
  const periodo = periodFromSlug(firstParam(params.periodo));
  const periodoParam = periodo === "hoy" ? undefined : periodo;
  const periodPhrase = PERIOD_PHRASES[periodo];
  const range = caracasPeriodRange(periodo, now);
  const hoy = caracasDayRange(now);
  const registrar = registrarFromSlug(firstParam(params.registrar));
  const error = errorMessage(params.error);
  // Qué dato marcar en rojo cuando el registro rápido vuelve con un error (lo manda la acción).
  const campo = error ? firstParam(params.campo) : undefined;
  const ok = okMessage(OK_LABELS, params.ok);

  // Las consultas arrancan juntas; cada bloque espera solo la suya.
  const resumen = inBackground(agencyDashboard(agencyId, range, now));
  const tickets = inBackground(listRecentTickets(agencyId, { ...range, limit: 5 }));
  const salidasHoy = inBackground(listAgencyDepartures(agencyId, { from: hoy.from, to: hoy.to }));
  const comprobantes = inBackground(countPendingProofs(agencyId));
  const flota = inBackground(agencyFleetStatus(agencyId, now));
  const actividad = inBackground(listAgencyActivity(agencyId, { ...range, limit: 12 }));

  const closeHref = panelFeedbackUrl("/panel", { periodo: periodoParam });

  function registrarHref(tipo: Registrar): string {
    return panelFeedbackUrl("/panel", { registrar: tipo, periodo: periodoParam });
  }

  const nombre = firstNamePart(user.name);

  return (
    <div className="flex flex-col gap-8">
      <PanelPageHeader
        title={`Tablero de ${user.agencyName ?? "tu agencia"}`}
        description={`${nombre ? `Hola, ${nombre}. ` : ""}Aquí ves lo que necesita tu atención y cómo va tu agencia.`}
        actions={
          <>
            <Link href="/panel/taquilla" className={panelButtonClass("primario", "lg")}>
              <IconStore className="size-5" />
              Vender un pasaje
            </Link>
            <Link href={registrarHref("cobro")} scroll={false} className={panelButtonClass("secundario", "lg")}>
              <IconCash className="size-5" />
              Registrar un cobro
            </Link>
          </>
        }
      />

      {/* Con un panel lateral abierto, el error lo muestra el propio formulario. */}
      <PanelFeedback error={registrar ? undefined : error} ok={ok} />

      <section aria-labelledby="atencion-titulo" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 id="atencion-titulo" className="text-lg font-semibold text-tinta">
            Lo que necesita tu atención
          </h2>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-tinta-suave">
            <span className="tabular">Datos de las {formatCaracasTime24(now)}.</span>
            <Link
              href={closeHref}
              scroll={false}
              className="foco inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 font-semibold text-marca-700 hover:bg-marca-50"
            >
              <IconRefresh className="size-4" />
              Actualizar
            </Link>
          </p>
        </div>
        <Suspense fallback={<AttentionSkeleton />}>
          <AttentionBlock pendingProofs={comprobantes} departures={salidasHoy} now={now} />
        </Suspense>
      </section>

      <section aria-labelledby="resumen-titulo" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <h2 id="resumen-titulo" className="text-lg font-semibold text-tinta">
            Resumen de {periodPhrase}
          </h2>
          <PanelTabs
            label="Periodo del resumen"
            tabs={DASHBOARD_PERIODS.map((p) => ({
              href: p === "hoy" ? "/panel" : `/panel?periodo=${p}`,
              label: DASHBOARD_PERIOD_LABELS[p],
              active: periodo === p,
            }))}
          />
        </div>
        <Suspense key={periodo} fallback={<FiguresSkeleton />}>
          <FiguresBlock summary={resumen} tickets={tickets} periodo={periodo} now={now} />
        </Suspense>
      </section>

      <Suspense fallback={<TripsTodaySkeleton />}>
        <TripsTodayBlock departures={salidasHoy} createDepartureHref={registrarHref("salida")} />
      </Suspense>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Suspense fallback={<SectionSkeleton rows={4} {...FLEET_SECTION} />}>
          <FleetBlock fleet={flota} now={now} registerDriverHref={registrarHref("chofer")} />
        </Suspense>
        <Suspense
          key={periodo}
          fallback={<SectionSkeleton rows={4} {...ticketsSection(periodPhrase)} />}
        >
          <TicketsBlock tickets={tickets} periodPhrase={periodPhrase} now={now} />
        </Suspense>
      </div>

      <div className="flex flex-col gap-4">
        <Collapsible title={ACTIVITY_TITLE} description={activityDescription(periodPhrase)}>
          <Suspense key={periodo} fallback={<ListRowsSkeleton rows={5} />}>
            <ActivityBlock activity={actividad} now={now} />
          </Suspense>
        </Collapsible>

        <Collapsible title={QUICK_REGISTER_SECTION.title} description={QUICK_REGISTER_SECTION.description}>
          <nav aria-label="Registro rápido" className="flex flex-wrap gap-3">
            <Link href={registrarHref("salida")} scroll={false} className={panelButtonClass("secundario")}>
              <IconCalendar className="size-5" />
              Crear una salida
            </Link>
            <Link href={registrarHref("vehiculo")} scroll={false} className={panelButtonClass("secundario")}>
              <IconBus className="size-5" />
              Registrar un vehículo
            </Link>
            <Link href={registrarHref("chofer")} scroll={false} className={panelButtonClass("secundario")}>
              <IconUsers className="size-5" />
              Registrar un chofer
            </Link>
          </nav>
        </Collapsible>
      </div>

      {registrar === "cobro" ? (
        <SidePanel
          title="Registrar un cobro en efectivo"
          subtitle="Escribe el código del ticket y el monto que recibiste."
          closeHref={closeHref}
        >
          <CashPaymentForm mode="codigo" returnTo="tablero" error={error} />
        </SidePanel>
      ) : null}

      {registrar === "salida" ? (
        <SidePanel title="Crear una salida" closeHref={closeHref}>
          <Suspense fallback={<SkeletonText lines={6} />}>
            <DeparturePanelContent agencyId={agencyId} error={error} errorField={campo} />
          </Suspense>
        </SidePanel>
      ) : null}

      {registrar === "vehiculo" ? (
        <SidePanel title="Registrar un vehículo" closeHref={closeHref}>
          <VehicleForm mode="create" returnTo="tablero" error={error} errorField={campo} />
        </SidePanel>
      ) : null}

      {registrar === "chofer" ? (
        <SidePanel title="Registrar un chofer" closeHref={closeHref}>
          <DriverForm mode="create" returnTo="tablero" error={error} errorField={campo} />
        </SidePanel>
      ) : null}
    </div>
  );
}
