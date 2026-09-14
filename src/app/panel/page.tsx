import Link from "next/link";
import { requireAgencyUser } from "@/modules/auth";
import { agencyDashboard, agencyFleetStatus, listAgencyActivity, listRecentTickets } from "@/modules/reports";
import { listAgencyDepartures, listRoutes } from "@/modules/catalog";
import { listDrivers, listVehicles } from "@/modules/agencies";
import { formatMoney } from "@/lib/decimal";
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
import { IconBus, IconCalendar, IconCash, IconStore, IconUsers, IconWarning } from "@/components/icons";
import { PanelPageHeader, PanelTabs, StatCard, panelButtonClass } from "@/components/panel-ui";
import { panelFeedbackUrl } from "./feedback";
import { CashPaymentForm } from "./_forms/cash-payment-form";
import { DepartureForm } from "./_forms/departure-form";
import { VehicleForm } from "./_forms/vehicle-form";
import { DriverForm } from "./_forms/driver-form";
import { FleetBlock } from "./_dashboard/fleet-block";
import { TicketsBlock } from "./_dashboard/tickets-block";
import { TripsTodayBlock } from "./_dashboard/trips-today-block";
import { ActivityBlock } from "./_dashboard/activity-block";

/** Traduce el código corto de `?ok=` a un texto. Un código desconocido no muestra nada. */
const OK_LABELS: Record<string, string> = {
  cobro: "Cobro registrado.",
  "cobro-ticket": "Cobro registrado. El saldo quedó en cero y se emitió el ticket.",
  "salida-creada": "Salida creada con éxito.",
  "vehiculo-creado": "Vehículo registrado con éxito.",
  "chofer-creado": "Chofer registrado con éxito.",
};

type Registrar = "cobro" | "salida" | "vehiculo" | "chofer";

const REGISTRAR_VALUES: readonly Registrar[] = ["cobro", "salida", "vehiculo", "chofer"];

function registrarFromSlug(slug: string | undefined): Registrar | undefined {
  return REGISTRAR_VALUES.find((valor) => valor === slug);
}

export default async function PanelPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; registrar?: string; ok?: string; error?: string }>;
}) {
  const { user, agencyId } = await requireAgencyUser("agency.reports");
  const params = await searchParams;

  const now = new Date();
  const periodo: DashboardPeriod = periodFromSlug(params.periodo);
  const periodoParam = periodo === "hoy" ? undefined : periodo;
  const periodLabel = DASHBOARD_PERIOD_LABELS[periodo];
  const range = caracasPeriodRange(periodo, now);
  const hoy = caracasDayRange(now);
  const registrar = registrarFromSlug(params.registrar);

  const [resumen, flota, tickets, actividad, salidasHoy, datosSalida] = await Promise.all([
    agencyDashboard(agencyId, range, now),
    agencyFleetStatus(agencyId, now),
    listRecentTickets(agencyId, { ...range, limit: 8 }),
    listAgencyActivity(agencyId, { ...range, limit: 12 }),
    listAgencyDepartures(agencyId, { from: hoy.from, to: hoy.to }),
    registrar === "salida"
      ? Promise.all([listRoutes(agencyId), listVehicles(agencyId), listDrivers(agencyId)])
      : Promise.resolve(null),
  ]);

  const [rutas, vehiculos, choferes] = datosSalida ?? [[], [], []];

  const panelAbierto = Boolean(registrar);
  const closeHref = panelFeedbackUrl("/panel", { periodo: periodoParam });

  function registrarHref(tipo: Registrar): string {
    return panelFeedbackUrl("/panel", { registrar: tipo, periodo: periodoParam });
  }

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader
        title={`Tablero de ${user.agencyName ?? "la agencia"}`}
        description={`Hora de Caracas · actualizado a las ${formatCaracasTime24(now)}`}
        actions={
          <PanelTabs
            label="Periodo del tablero"
            tabs={DASHBOARD_PERIODS.map((p) => ({
              href: p === "hoy" ? "/panel" : `/panel?periodo=${p}`,
              label: DASHBOARD_PERIOD_LABELS[p],
              active: periodo === p,
            }))}
          />
        }
      />

      <PanelFeedback
        error={panelAbierto ? undefined : params.error}
        ok={params.ok ? OK_LABELS[params.ok] : undefined}
      />

      <nav aria-label="Registro rápido" className="flex flex-wrap gap-2">
        <Link href="/panel/taquilla" className={panelButtonClass("primario", "md", "min-h-11!")}>
          <IconStore className="h-4 w-4" />
          Vender en taquilla
        </Link>
        <Link
          href={registrarHref("cobro")}
          scroll={false}
          className={panelButtonClass("secundario", "md", "min-h-11!")}
        >
          <IconCash className="h-4 w-4" />
          Registrar cobro
        </Link>
        <Link
          href={registrarHref("salida")}
          scroll={false}
          className={panelButtonClass("secundario", "md", "min-h-11!")}
        >
          <IconCalendar className="h-4 w-4" />
          Crear salida
        </Link>
        <Link
          href={registrarHref("vehiculo")}
          scroll={false}
          className={panelButtonClass("secundario", "md", "min-h-11!")}
        >
          <IconBus className="h-4 w-4" />
          Registrar vehículo
        </Link>
        <Link
          href={registrarHref("chofer")}
          scroll={false}
          className={panelButtonClass("secundario", "md", "min-h-11!")}
        >
          <IconUsers className="h-4 w-4" />
          Registrar chofer
        </Link>
      </nav>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Tickets pendientes"
          value={resumen.pendingTickets.total}
          detail={`${resumen.pendingTickets.proofsToReview} comprobante(s) por revisar · ${resumen.pendingTickets.payOnSite} pago en sitio`}
          href="/panel/pasajeros?vista=por-cobrar"
          tone={resumen.pendingTickets.proofsToReview > 0 ? "alerta" : "neutro"}
        />
        <StatCard
          label={`Salidas · ${periodLabel}`}
          value={resumen.departures.total}
          detail={`${resumen.departures.programadas} programadas · ${resumen.departures.embarcando} embarcando · ${resumen.departures.enRuta} en ruta · ${resumen.departures.finalizadas} finalizadas`}
          href="/panel/salidas"
        />
        <StatCard
          label={`Recaudación · ${periodLabel}`}
          value={formatMoney(resumen.revenue.totalUsd, "USD")}
          detail={`${resumen.revenue.payments} pago(s) aprobados o en efectivo`}
          href={`/panel/reportes?vista=recaudacion&periodo=${periodo}`}
        />
      </div>

      {resumen.failedMessages > 0 ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-[var(--color-alerta)] bg-[var(--color-alerta-suave)] px-4 py-3 text-sm text-[var(--color-alerta)]"
        >
          <IconWarning className="h-5 w-5 shrink-0" />
          <p>
            {resumen.failedMessages} mensaje(s) a pasajeros no se pudieron enviar. El administrador del
            terminal los revisa en su bandeja.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FleetBlock fleet={flota} now={now} registrarChoferHref={registrarHref("chofer")} />
        <TicketsBlock tickets={tickets} periodLabel={periodLabel} now={now} />
        <TripsTodayBlock departures={salidasHoy} registrarSalidaHref={registrarHref("salida")} />
        <div className="lg:col-span-2">
          <ActivityBlock activity={actividad} periodLabel={periodLabel} now={now} />
        </div>
      </div>

      {registrar === "cobro" ? (
        <SidePanel title="Registrar cobro en efectivo" closeHref={closeHref}>
          <CashPaymentForm mode="codigo" returnTo="tablero" error={params.error} />
        </SidePanel>
      ) : null}

      {registrar === "salida" ? (
        <SidePanel title="Crear salida" closeHref={closeHref}>
          <DepartureForm
            routes={rutas}
            vehicles={vehiculos.filter((v) => v.active)}
            drivers={choferes.filter((d) => d.active)}
            returnTo="tablero"
            error={params.error}
          />
        </SidePanel>
      ) : null}

      {registrar === "vehiculo" ? (
        <SidePanel title="Registrar vehículo" closeHref={closeHref}>
          <VehicleForm mode="create" returnTo="tablero" error={params.error} />
        </SidePanel>
      ) : null}

      {registrar === "chofer" ? (
        <SidePanel title="Registrar chofer" closeHref={closeHref}>
          <DriverForm mode="create" returnTo="tablero" error={params.error} />
        </SidePanel>
      ) : null}
    </div>
  );
}
