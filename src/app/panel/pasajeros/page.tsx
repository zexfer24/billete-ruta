import Link from "next/link";
import { z } from "zod";
import { ForbiddenError, requireAgencyUser } from "@/modules/auth";
import { listAgencyDepartures } from "@/modules/catalog";
import {
  countAgencyReservationViews,
  getAgencyReservationDetail,
  listAgencyPassengers,
  listPendingProofQueue,
  RESERVATION_VIEW_LABELS,
  RESERVATION_VIEWS,
  reservationViewFromSlug,
} from "@/modules/reports";
import type { AgencyPassengerRow, ReservationView } from "@/modules/reports";
import { countPendingProofs, getProofReview } from "@/modules/payments";
import { formatMoney, toDecimal } from "@/lib/decimal";
import { formatCaracas, formatCaracasDateTime24 } from "@/lib/time";
import { maskIdNumber } from "@/lib/identity";
import {
  departureStatusLabel,
  departureStatusTone,
  reservationStatusLabel,
  reservationStatusTone,
  salesChannelLabel,
} from "@/lib/labels";
import { SidePanel } from "@/components/side-panel";
import { ClickableRow } from "@/components/clickable-row";
import { PanelFeedback } from "@/components/panel-feedback";
import {
  EmptyState,
  PANEL_LABEL_CLASS,
  PanelPageHeader,
  PanelTabs,
  StatusBadge,
  TableShell,
  panelButtonClass,
  panelInputClass,
} from "@/components/panel-ui";
import { IconCash } from "@/components/icons";
import { CashPaymentForm } from "@/app/panel/_forms/cash-payment-form";
import { coverageBadge, ProofReviewPanel } from "./proof-review";
import { ReservationDetailPanel } from "./reservation-detail";
import { pasajerosUrl } from "./urls";

/** Traduce el código corto de `?ok=` a un texto. Un código desconocido no muestra nada. */
const OK_LABELS: Record<string, string> = {
  aprobado: "Pago aprobado.",
  rechazado: "Comprobante rechazado.",
  cobro: "Cobro registrado.",
  "cobro-ticket": "Cobro registrado. El saldo quedó en cero y se emitió el ticket.",
};

const EMPTY_STATE_TEXT: Record<ReservationView, string> = {
  "por-revisar": "No hay comprobantes por revisar.",
  "por-cobrar": "No hay reservas con saldo pendiente.",
  pagadas: "Todavía no hay reservas pagadas con estos filtros.",
  "sin-efecto": "No hay reservas sin efecto con estos filtros.",
  todas: "No hay reservas con estos filtros.",
};

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildCsv(rows: AgencyPassengerRow[]): string {
  const header = [
    "Serial",
    "Titular",
    "Cédula",
    "Ruta",
    "Salida",
    "Cantidad",
    "Total USD",
    "Abonado USD",
    "Saldo USD",
    "Estado de pago",
    "Canal",
  ];
  const lines = rows.map((r) =>
    [
      r.code,
      r.holderName,
      maskIdNumber(r.holderIdNumber),
      r.routeName,
      formatCaracasDateTime24(r.departsAt),
      String(r.passengerCount),
      r.totalUsd,
      r.paidUsd,
      r.balanceUsd,
      r.paymentState,
      salesChannelLabel(r.salesChannel),
    ]
      .map(csvField)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--color-texto-suave)]">
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={buildHref(page - 1)} className={panelButtonClass("secundario", "sm")}>
            Anterior
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link href={buildHref(page + 1)} className={panelButtonClass("secundario", "sm")}>
            Siguiente
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default async function PasajerosPage({
  searchParams,
}: {
  searchParams: Promise<{
    vista?: string;
    salida?: string;
    buscar?: string;
    pagina?: string;
    reserva?: string;
    comprobante?: string;
    registrar?: string;
    ok?: string;
    error?: string;
  }>;
}) {
  const { agencyId } = await requireAgencyUser("payments.review");
  const params = await searchParams;

  const paginaActual = Math.max(1, Number.parseInt(params.pagina ?? "1", 10) || 1);
  const salida = params.salida || undefined;
  const buscar = params.buscar || undefined;
  const registrarCobro = params.registrar === "cobro";

  const reservaParsed = z.string().uuid().safeParse(params.reserva);
  const reservaIdParam = reservaParsed.success ? reservaParsed.data : undefined;
  const comprobanteParsed = z.string().uuid().safeParse(params.comprobante);
  const comprobanteIdParam = comprobanteParsed.success ? comprobanteParsed.data : undefined;

  const [counts, pendingProofsCount, departures] = await Promise.all([
    countAgencyReservationViews(agencyId, { departureId: salida, search: buscar }),
    countPendingProofs(agencyId),
    listAgencyDepartures(agencyId, { from: new Date(Date.now() - 30 * 24 * 3_600_000) }),
  ]);

  const vistaValida = reservationViewFromSlug(params.vista);
  const vista: ReservationView = vistaValida ?? (pendingProofsCount > 0 ? "por-revisar" : "todas");
  const esPorRevisar = vista === "por-revisar";

  const [porRevisar, pasajeros, exportables, detail, review] = await Promise.all([
    esPorRevisar ? listPendingProofQueue(agencyId, { page: paginaActual, pageSize: 25 }) : Promise.resolve(null),
    esPorRevisar
      ? Promise.resolve(null)
      : listAgencyPassengers(agencyId, {
          view: vista,
          departureId: salida,
          search: buscar,
          page: paginaActual,
          pageSize: 50,
        }),
    esPorRevisar
      ? Promise.resolve<AgencyPassengerRow[]>([])
      : listAgencyPassengers(agencyId, {
          view: vista,
          departureId: salida,
          search: buscar,
          page: 1,
          pageSize: 500,
        }).then((r) => r.rows),
    reservaIdParam
      ? getAgencyReservationDetail(reservaIdParam, agencyId).catch((error: unknown) => {
          if (error instanceof ForbiddenError) return null;
          throw error;
        })
      : Promise.resolve(null),
    comprobanteIdParam
      ? getProofReview(comprobanteIdParam, agencyId).catch((error: unknown) => {
          if (error instanceof ForbiddenError) return null;
          throw error;
        })
      : Promise.resolve(null),
  ]);

  const reservaAbierta = detail !== null;
  const comprobanteAbierto = review !== null;
  const panelAbierto = registrarCobro || reservaAbierta || comprobanteAbierto;

  const hiddenFiltros: Record<string, string> = {};
  if (vista) hiddenFiltros.vista = vista;
  if (paginaActual > 1) hiddenFiltros.pagina = String(paginaActual);
  if (salida) hiddenFiltros.salida = salida;
  if (buscar) hiddenFiltros.buscar = buscar;

  const closeHref = pasajerosUrl({ vista, salida, buscar, pagina: paginaActual });

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader
        title="Pasajeros y pagos"
        description="Reservas de tu agencia con su estado de pago, comprobantes y cobros."
        actions={
          <>
            <Link
              href={pasajerosUrl({ vista, salida, buscar, pagina: paginaActual, registrar: "cobro" })}
              className={panelButtonClass("secundario")}
            >
              <IconCash width={18} height={18} aria-hidden="true" />
              Registrar cobro
            </Link>
            {!esPorRevisar ? (
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(buildCsv(exportables))}`}
                download="pasajeros.csv"
                className={panelButtonClass("secundario")}
              >
                Exportar CSV
              </a>
            ) : null}
          </>
        }
      />

      <PanelFeedback
        ok={params.ok ? OK_LABELS[params.ok] : undefined}
        error={panelAbierto ? undefined : params.error}
      />

      <PanelTabs
        label="Situación de las reservas"
        tabs={RESERVATION_VIEWS.map((v) => ({
          href: pasajerosUrl({ vista: v, salida, buscar }),
          label: RESERVATION_VIEW_LABELS[v],
          count: v === "por-revisar" ? pendingProofsCount : counts[v],
          active: v === vista,
        }))}
      />

      {!esPorRevisar ? (
        <form method="get" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="vista" value={vista} />
          <label className={PANEL_LABEL_CLASS}>
            Salida
            <select name="salida" defaultValue={salida ?? ""} className={panelInputClass()}>
              <option value="">Todas</option>
              {departures.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.routeName} · {formatCaracasDateTime24(d.departsAt)}
                </option>
              ))}
            </select>
          </label>
          <label className={PANEL_LABEL_CLASS}>
            Buscar
            <input
              type="text"
              name="buscar"
              defaultValue={buscar ?? ""}
              placeholder="Serial, nombre o cédula"
              className={panelInputClass()}
            />
          </label>
          <button type="submit" className={panelButtonClass("primario")}>
            Filtrar
          </button>
          <Link href={pasajerosUrl({ vista })} className={panelButtonClass("secundario")}>
            Limpiar
          </Link>
        </form>
      ) : null}

      {esPorRevisar && porRevisar ? (
        porRevisar.rows.length === 0 ? (
          <EmptyState title={EMPTY_STATE_TEXT["por-revisar"]} />
        ) : (
          <>
            <TableShell>
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="border-b border-[var(--color-borde)] text-[var(--color-texto-suave)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Serial y referencia</th>
                    <th className="px-4 py-3 font-medium">Titular y C.I.</th>
                    <th className="px-4 py-3 font-medium">Salida</th>
                    <th className="px-4 py-3 font-medium">Declarado</th>
                    <th className="px-4 py-3 font-medium">En dólares</th>
                    <th className="px-4 py-3 font-medium">Saldo</th>
                    <th className="px-4 py-3 font-medium">Cobertura</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {porRevisar.rows.map((row) => {
                    const href = pasajerosUrl({
                      vista: "por-revisar",
                      pagina: paginaActual,
                      comprobante: row.proofId,
                    });
                    const badge = coverageBadge(row.coverage);
                    return (
                      <ClickableRow
                        key={row.proofId}
                        href={href}
                        selected={row.proofId === comprobanteIdParam}
                        className="border-b border-[var(--color-borde)] last:border-b-0 align-top"
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium">{row.code}</span>
                          <span className="block text-xs text-[var(--color-texto-suave)]">
                            Ref. {row.reference}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.holderName}
                          <span className="tabular block text-xs text-[var(--color-texto-suave)]">
                            {row.maskedHolderIdNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.routeName}
                          <span className="tabular block text-xs text-[var(--color-texto-suave)]">
                            {formatCaracasDateTime24(row.departsAt)}
                          </span>
                          {row.departureStatus !== "PROGRAMADA" ? (
                            <span className="mt-1 block">
                              <StatusBadge
                                label={departureStatusLabel(row.departureStatus)}
                                tone={departureStatusTone(row.departureStatus)}
                              />
                            </span>
                          ) : null}
                        </td>
                        <td className="tabular px-4 py-3">{formatMoney(row.amount, row.currency)}</td>
                        <td className="tabular px-4 py-3">{formatMoney(row.amountUsd, "USD")}</td>
                        <td className="tabular px-4 py-3 font-medium">
                          {formatMoney(row.balanceUsd, "USD")}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge label={badge.label} tone={badge.tone} />
                        </td>
                        <td className="px-4 py-3">
                          <Link href={href} scroll={false} className={panelButtonClass("secundario", "sm")}>
                            Revisar
                          </Link>
                        </td>
                      </ClickableRow>
                    );
                  })}
                </tbody>
              </table>
            </TableShell>
            <Pagination
              page={porRevisar.page}
              totalPages={Math.max(1, Math.ceil(porRevisar.total / porRevisar.pageSize))}
              buildHref={(p) => pasajerosUrl({ vista: "por-revisar", pagina: p })}
            />
          </>
        )
      ) : null}

      {!esPorRevisar && pasajeros ? (
        pasajeros.rows.length === 0 ? (
          <EmptyState title={EMPTY_STATE_TEXT[vista]} />
        ) : (
          <>
            <TableShell>
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="border-b border-[var(--color-borde)] text-[var(--color-texto-suave)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Serial</th>
                    <th className="px-4 py-3 font-medium">Titular y C.I.</th>
                    <th className="px-4 py-3 font-medium">Salida</th>
                    <th className="px-4 py-3 font-medium">Pas.</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Abonado</th>
                    <th className="px-4 py-3 font-medium">Saldo</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Situación</th>
                  </tr>
                </thead>
                <tbody>
                  {pasajeros.rows.map((row) => {
                    const href = pasajerosUrl({
                      vista,
                      salida,
                      buscar,
                      pagina: paginaActual,
                      reserva: row.reservationId,
                    });
                    return (
                      <ClickableRow
                        key={row.reservationId}
                        href={href}
                        selected={row.reservationId === reservaIdParam}
                        className="border-b border-[var(--color-borde)] last:border-b-0 align-top"
                      >
                        <td className="tabular px-4 py-3">
                          {row.code}
                          {row.salesChannel === "TAQUILLA" ? (
                            <span className="mt-1 block">
                              <StatusBadge label="Taquilla" tone="neutro" />
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {row.holderName}
                          <span className="tabular block text-xs text-[var(--color-texto-suave)]">
                            {maskIdNumber(row.holderIdNumber)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.routeName}
                          <span className="tabular block text-xs text-[var(--color-texto-suave)]">
                            {formatCaracasDateTime24(row.departsAt)}
                          </span>
                        </td>
                        <td className="tabular px-4 py-3">{row.passengerCount}</td>
                        <td className="tabular px-4 py-3">{formatMoney(toDecimal(row.totalUsd), "USD")}</td>
                        <td className="tabular px-4 py-3">{formatMoney(toDecimal(row.paidUsd), "USD")}</td>
                        <td className="tabular px-4 py-3 font-medium">
                          {formatMoney(toDecimal(row.balanceUsd), "USD")}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            label={reservationStatusLabel(row.status)}
                            tone={reservationStatusTone(row.status)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {row.hasPendingProof ? (
                            <StatusBadge label="Comprobante en revisión" tone="alerta" />
                          ) : row.ticketIssuedAt ? (
                            <StatusBadge
                              label={`Ticket ${formatCaracas(row.ticketIssuedAt, "HH:mm dd/MM")}`}
                              tone="exito"
                            />
                          ) : (
                            <span className="text-[var(--color-texto-suave)]">—</span>
                          )}
                        </td>
                      </ClickableRow>
                    );
                  })}
                </tbody>
              </table>
            </TableShell>
            <Pagination
              page={pasajeros.page}
              totalPages={Math.max(1, Math.ceil(pasajeros.total / pasajeros.pageSize))}
              buildHref={(p) => pasajerosUrl({ vista, salida, buscar, pagina: p })}
            />
          </>
        )
      ) : null}

      {registrarCobro ? (
        <SidePanel title="Registrar cobro en efectivo" closeHref={closeHref}>
          <CashPaymentForm mode="codigo" hidden={hiddenFiltros} error={params.error} />
        </SidePanel>
      ) : null}

      {reservaAbierta && detail ? (
        <SidePanel
          title={`Reserva ${detail.reservation.code}`}
          subtitle={`${detail.holder.fullName} · ${detail.holder.maskedIdNumber}`}
          closeHref={closeHref}
        >
          <ReservationDetailPanel
            detail={detail}
            hidden={{ ...hiddenFiltros, reservaId: detail.reservation.id }}
            error={params.error}
          />
        </SidePanel>
      ) : null}

      {comprobanteAbierto && review ? (
        <SidePanel
          title={`Comprobante ${review.reservation.code}`}
          subtitle={`${review.reservation.holderName} · ${maskIdNumber(review.reservation.holderIdNumber)}`}
          closeHref={closeHref}
        >
          <ProofReviewPanel review={review} hidden={hiddenFiltros} error={params.error} />
        </SidePanel>
      ) : null}
    </div>
  );
}
