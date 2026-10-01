import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listAgencyPassengers, listPendingProofQueue } from "@/modules/reports";
import type { AgencyPassengerRow, PendingProofRow, ReservationView } from "@/modules/reports";
import type { ProofCoverage } from "@/modules/payments";
import { formatMoney, toDecimal } from "@/lib/decimal";
import { maskIdNumber } from "@/lib/identity";
import { formatCaracas } from "@/lib/time";
import { departureStatusLabel, reservationStatusLabel, reservationStatusTone, type StatusTone } from "@/lib/labels";
import {
  EmptyState,
  PANEL_TD_CLASS,
  PANEL_TH_CLASS,
  ProgressBar,
  StatusBadge,
  panelButtonClass,
} from "@/components/panel-ui";
import { IconCheckCircle, IconChevronLeft, IconChevronRight, IconList, IconSearch } from "@/components/icons";
import { countLabel } from "../_dashboard/text";
import { afterApproval, coverageBadge } from "./proof-review";
import { arrowRouteName, proofUrgency, tripWhenText } from "./trip-text";
import { lastValidPage, pasajerosUrl } from "./urls";
import { showsUsdEquivalent } from "./money";
import { LinkPendingIcon, LinkRow } from "./link-pending";
import { ResponsiveTable } from "../_dashboard/responsive-table";

/**
 * Filas por página. Las reservas van de 25 en 25. La cola de comprobantes va
 * de 15 en 15 en todos los anchos (nunca según el dispositivo, para que
 * `?pagina=2` muestre lo mismo en el teléfono y en el escritorio): es una cola
 * de trabajo que se atiende de arriba abajo, y así la paginación no queda al
 * fondo de diez pantallas en el teléfono.
 */
export const RESERVATIONS_PAGE_SIZE = 25;
export const PROOFS_PAGE_SIZE = 15;

/** Ancho mínimo del nombre de la ruta en las tablas, para que "Caracas → San Cristóbal" no se parta. */
const ROUTE_CELL_CLASS = "block min-w-52";

/** Estado vacío de cada vista cuando no hay filtros activos. */
const EMPTY_BY_VIEW: Record<Exclude<ReservationView, "por-revisar">, { title: string; description: string }> = {
  "por-cobrar": {
    title: "Ninguna reserva debe dinero",
    description: "Aquí aparecen las reservas que todavía tienen saldo pendiente.",
  },
  pagadas: {
    title: "Todavía no hay reservas pagadas",
    description: "Cuando una reserva quede pagada por completo, aparecerá aquí con su ticket.",
  },
  "sin-efecto": {
    title: "No hay reservas anuladas",
    description: "Aquí aparecen las reservas liberadas, canceladas o de pasajeros que no se presentaron.",
  },
  todas: {
    title: "Todavía no hay reservas",
    description: "Cuando vendas un pasaje o un pasajero reserve en la app, aparecerá aquí.",
  },
};

/** Una sola pastilla por reserva: el comprobante pendiente manda sobre el estado. */
function rowSituation(row: AgencyPassengerRow): { label: string; tone: StatusTone } {
  if (row.hasPendingProof) return { label: "Comprobante por revisar", tone: "alerta" };
  return { label: reservationStatusLabel(row.status), tone: reservationStatusTone(row.status) };
}

/**
 * "Si lo apruebas: …" solo cuando dice algo que la pastilla no dice ya: con
 * "Completa el pago", "queda pagada" repetía lo mismo. Se conserva en el abono
 * parcial (cuánto quedará por pagar) y en el pago de más (que igual queda
 * pagada).
 */
function afterApprovalAddsInfo(coverage: ProofCoverage): boolean {
  return coverage.kind !== "PAGO_COMPLETO";
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/**
 * Aviso de la salida de un comprobante: la pastilla de urgencia (atrasada,
 * sale pronto o dentro de unas horas, de `proofUrgency`) y, si la salida ya no
 * está programada, en qué estado está ("Salida: En ruta"). Con el embarque
 * abierto y atrasada, la pastilla ya dice "Embarque abierto · debía salir…"
 * y no se repite.
 */
function departureFlags(row: PendingProofRow, now: Date): { urgency: ReactNode; statusNote: string | null } {
  const aviso = proofUrgency({ status: row.departureStatus, departsAt: row.departsAt }, now);
  const repiteEstado = aviso?.kind === "atrasada" && row.departureStatus === "MANIFIESTO_CERRADO";
  return {
    urgency: aviso ? <StatusBadge label={aviso.text} tone="alerta" /> : null,
    statusNote:
      row.departureStatus !== "PROGRAMADA" && !repiteEstado
        ? `Salida: ${departureStatusLabel(row.departureStatus)}`
        : null,
  };
}

/**
 * Referencia del comprobante en una sola línea. Si el pasajero ya la escribió
 * con el prefijo ("REF-681744"), no se le antepone la palabra "Referencia",
 * que decía lo mismo y alargaba la fila un renglón.
 */
function referenceText(reference: string): string {
  return /^ref\b/i.test(reference.trim()) ? reference : `Referencia ${reference}`;
}

/**
 * Cédula enmascarada y código de la reserva, cada uno en su línea y sin
 * partirse: es el dato que el taquillero lee en voz alta o compara, y un
 * corte en el guion ("TR-1001-1PAX-" / "BYJA") lo hacía ilegible.
 */
function HolderIdAndCode({ idNumber, code }: { idNumber: string; code: string }) {
  return (
    <>
      <span className="tabular block text-tinta-suave">{idNumber}</span>
      <span className="tabular block whitespace-nowrap text-tinta-suave">{code}</span>
    </>
  );
}

/**
 * Tarjeta de una fila de la lista en el teléfono y la tableta, la misma en
 * las cinco pestañas: toda la tarjeta es el único enlace. Lleva el nombre, las
 * pastillas, la cédula y el código en una línea, el viaje, el dato de dinero
 * y, al pie, la acción con texto visible ("Revisar", "Ver detalle") y la
 * flecha, que cambia por el indicador de espera mientras se abre el panel
 * lateral. Sin botón de ancho completo, cada tarjeta ocupa unos 190 px en vez
 * de 300.
 */
function LinkCard({
  href,
  title,
  srPrefix,
  badges,
  idNumber,
  code,
  trip,
  children,
  actionLabel,
}: {
  href: string;
  title: string;
  /** Texto para lectores de pantalla antes del nombre ("Revisar el comprobante de "). */
  srPrefix: string;
  badges: ReactNode;
  idNumber: string;
  code: string;
  trip: ReactNode;
  children: ReactNode;
  actionLabel: string;
}) {
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        className="foco relative flex h-full flex-col gap-1 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1 transition-colors duration-150 ease-out hover:bg-marca-50/60 motion-reduce:transition-none"
      >
        <span className="break-words text-base font-semibold text-tinta">
          <span className="sr-only">{srPrefix}</span>
          {title}
        </span>
        <span className="flex flex-wrap gap-1.5">{badges}</span>
        <span className="tabular text-sm text-tinta-suave">
          <span className="whitespace-nowrap">{idNumber}</span> · <span className="whitespace-nowrap">{code}</span>
        </span>
        <span className="tabular text-sm text-tinta-suave">{trip}</span>
        {children}
        {/* La acción ya está en el texto oculto del principio: aquí solo se ve. */}
        <span className="mt-1 inline-flex min-h-6 items-center gap-1 text-[15px] font-semibold text-marca-700">
          <span aria-hidden="true">{actionLabel}</span>
          <LinkPendingIcon icon={<IconChevronRight className="size-5 shrink-0" />} />
        </span>
      </Link>
    </li>
  );
}

/** Viaje de una fila: la ruta con flecha y el día y la hora en lenguaje llano ("Hoy 21:00"). */
function TripLine({ route, departsAt, now }: { route: string; departsAt: Date; now: Date }) {
  return (
    <>
      {route} · <span className="whitespace-nowrap">{tripWhenText(departsAt, now)}</span>
    </>
  );
}

/**
 * Monto enviado sin separarse de su símbolo y, si la moneda no va 1:1 con el
 * dólar, su equivalente debajo con la misma frase del panel lateral.
 */
function SentAmount({
  amount,
  currency,
  amountUsd,
  strong = false,
}: {
  amount: Parameters<typeof formatMoney>[0];
  currency: Parameters<typeof formatMoney>[1];
  amountUsd: Parameters<typeof formatMoney>[0];
  strong?: boolean;
}) {
  return (
    <>
      <span className={`tabular block whitespace-nowrap${strong ? " font-semibold" : ""}`}>
        {formatMoney(amount, currency)}
      </span>
      {showsUsdEquivalent(currency) ? (
        <span className="tabular block text-sm font-normal text-tinta-suave">
          Equivale a <span className="whitespace-nowrap">{formatMoney(amountUsd, "USD")}</span>
        </span>
      ) : null}
    </>
  );
}

/** Barra de lo pagado sobre el total, con lo que falta. */
function PaymentProgress({ row }: { row: AgencyPassengerRow }) {
  const total = toDecimal(row.totalUsd);
  const pagado = toDecimal(row.paidUsd);
  const saldo = toDecimal(row.balanceUsd);
  const completo = !saldo.greaterThan(0);
  return (
    <ProgressBar
      value={Number(row.paidUsd)}
      max={Number(row.totalUsd)}
      label={`${formatMoney(pagado, "USD")} de ${formatMoney(total, "USD")}`}
      detail={completo ? "Completo" : `Falta ${formatMoney(saldo, "USD")}`}
      tone={completo ? "exito" : "marca"}
      className="min-w-44"
    />
  );
}

/** Rango de filas visibles y total, por ejemplo "Mostrando 1 a 50 de 132 reservas". */
function ResultsSummary({
  page,
  pageSize,
  shown,
  total,
  noun,
}: {
  page: number;
  pageSize: number;
  shown: number;
  total: number;
  noun: [string, string];
}) {
  const desde = (page - 1) * pageSize + 1;
  const hasta = desde + shown - 1;
  return (
    <p className="tabular text-[15px] text-tinta-suave" aria-live="polite">
      {total <= pageSize
        ? countLabel(total, noun[0], noun[1])
        : `Mostrando ${desde} a ${hasta} de ${countLabel(total, noun[0], noun[1])}`}
    </p>
  );
}

/**
 * Tarjeta de un comprobante por revisar (`LinkCard`): la pastilla de qué
 * cubre con la de urgencia, el viaje con su día y hora, cuánto envió y, solo
 * si agrega algo, cómo queda la reserva si se aprueba.
 */
function ProofQueueCard({
  row,
  href,
  badge,
  urgency,
  statusNote,
  now,
}: {
  row: PendingProofRow;
  href: string;
  badge: { label: string; tone: StatusTone };
  urgency: ReactNode;
  statusNote: string | null;
  now: Date;
}) {
  return (
    <LinkCard
      href={href}
      title={row.holderName}
      srPrefix="Revisar el comprobante de "
      badges={
        <>
          <StatusBadge label={badge.label} tone={badge.tone} />
          {urgency}
        </>
      }
      idNumber={row.maskedHolderIdNumber}
      code={row.code}
      trip={<TripLine route={`${row.origin} → ${row.destination}`} departsAt={row.departsAt} now={now} />}
      actionLabel="Revisar"
    >
      {statusNote ? <span className="text-sm font-semibold text-alerta">{statusNote}</span> : null}
      <span className="tabular text-[15px] text-tinta">
        Envió <span className="whitespace-nowrap font-semibold">{formatMoney(row.amount, row.currency)}</span>
        {showsUsdEquivalent(row.currency) ? (
          <span className="text-tinta-suave">
            {" "}
            (equivale a <span className="whitespace-nowrap">{formatMoney(row.amountUsd, "USD")}</span>)
          </span>
        ) : null}
      </span>
      {afterApprovalAddsInfo(row.coverage) ? (
        <span className="tabular text-sm text-tinta-suave">
          Si lo apruebas: {lowerFirst(afterApproval(row.coverage))}
        </span>
      ) : null}
    </LinkCard>
  );
}


/** Paginación con "Anterior" y "Siguiente" de 44 px y la página actual en palabras. */
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
    <nav aria-label="Páginas de la lista" className="flex flex-wrap items-center justify-between gap-3">
      <p className="tabular text-[15px] text-tinta-suave">
        Página {page} de {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={buildHref(page - 1)} className={panelButtonClass("secundario")}>
            <IconChevronLeft className="size-5" />
            Anterior
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link href={buildHref(page + 1)} className={panelButtonClass("secundario")}>
            Siguiente
            <IconChevronRight className="size-5" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

/**
 * Vista "Por revisar": la cola de comprobantes pendientes en el orden de
 * `listPendingProofQueue` (primero los de la salida más próxima, incluidas las
 * atrasadas, y al final los de salidas que ya partieron), con una pastilla de
 * alerta en los de salidas atrasadas o próximas. En escritorio cada fila tiene
 * un solo enlace, "Revisar", que abre el panel lateral (el resto de la fila
 * lleva al mismo lugar con el ratón); en el teléfono y la tableta, la tarjeta
 * entera es ese enlace.
 */
export async function ProofQueueList({
  agencyId,
  page,
  selectedProofId,
  okCode,
}: {
  agencyId: string;
  page: number;
  selectedProofId?: string;
  /** Código de `?ok=` que se conserva si hay que corregir la página. */
  okCode?: string;
}) {
  // El mismo instante para el orden de la cola y para los avisos de cada fila.
  const now = new Date();
  const cola = await listPendingProofQueue(agencyId, { page, pageSize: PROOFS_PAGE_SIZE }, now);

  // Tras aprobar o rechazar el último de la última página, cae a la última página válida.
  const paginaValida = lastValidPage(cola.total, cola.pageSize, page);
  if (paginaValida !== page) {
    redirect(pasajerosUrl({ vista: "por-revisar", pagina: paginaValida, ok: okCode }));
  }

  if (cola.rows.length === 0) {
    return (
      <EmptyState
        icon={<IconCheckCircle />}
        title="No hay comprobantes por revisar"
        description="Cuando un pasajero envíe un comprobante de pago, aparecerá aquí para que lo revises."
        action={
          <Link href={pasajerosUrl({ vista: "todas" })} className={panelButtonClass("secundario")}>
            Ver todas las reservas
          </Link>
        }
      />
    );
  }

  const filas = cola.rows.map((row) => ({
    row,
    href: pasajerosUrl({ vista: "por-revisar", pagina: page, comprobante: row.proofId }),
    badge: coverageBadge(row.coverage),
    ...departureFlags(row, now),
  }));

  return (
    <div className="flex flex-col gap-4">
      <ResultsSummary
        page={cola.page}
        pageSize={cola.pageSize}
        shown={cola.rows.length}
        total={cola.total}
        noun={["comprobante por revisar", "comprobantes por revisar"]}
      />
      <ResponsiveTable
        cards={
          <>
            {filas.map(({ row, href, badge, urgency, statusNote }) => (
              <ProofQueueCard
                key={row.proofId}
                row={row}
                href={href}
                badge={badge}
                urgency={urgency}
                statusNote={statusNote}
                now={now}
              />
            ))}
          </>
        }
        table={
          <table className="w-full text-left">
            <thead className="border-b border-borde">
              <tr>
                <th scope="col" className={PANEL_TH_CLASS}>
                  Pasajero
                </th>
                <th scope="col" className={PANEL_TH_CLASS}>
                  Viaje
                </th>
                <th scope="col" className={PANEL_TH_CLASS}>
                  Monto enviado
                </th>
                <th scope="col" className={PANEL_TH_CLASS}>
                  Qué cubre
                </th>
                <th scope="col" className={PANEL_TH_CLASS}>
                  <span className="sr-only">Acción</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ row, href, badge, urgency, statusNote }) => (
                <LinkRow
                  key={row.proofId}
                  selected={row.proofId === selectedProofId}
                  className="border-b border-borde last:border-b-0"
                >
                  <td className={PANEL_TD_CLASS}>
                    <span className="block font-semibold">{row.holderName}</span>
                    <HolderIdAndCode idNumber={row.maskedHolderIdNumber} code={row.code} />
                  </td>
                  <td className={PANEL_TD_CLASS}>
                    <span className={ROUTE_CELL_CLASS}>
                      {row.origin} → {row.destination}
                    </span>
                    <span className="tabular block text-tinta-suave">{tripWhenText(row.departsAt, now)}</span>
                    {urgency ? <span className="mt-1 block">{urgency}</span> : null}
                    {statusNote ? <span className="block font-semibold text-alerta">{statusNote}</span> : null}
                  </td>
                  <td className={PANEL_TD_CLASS}>
                    <SentAmount amount={row.amount} currency={row.currency} amountUsd={row.amountUsd} strong />
                    <span className="tabular block whitespace-nowrap text-tinta-suave">
                      {referenceText(row.reference)}
                    </span>
                  </td>
                  <td className={PANEL_TD_CLASS}>
                    <StatusBadge label={badge.label} tone={badge.tone} />
                    {afterApprovalAddsInfo(row.coverage) ? (
                      <span className="tabular mt-1 block text-tinta-suave">
                        Si lo apruebas: {lowerFirst(afterApproval(row.coverage))}
                      </span>
                    ) : null}
                  </td>
                  <td className={`${PANEL_TD_CLASS} text-right`}>
                    <Link
                      href={href}
                      scroll={false}
                      data-row-link
                      className={panelButtonClass("secundario", "md", "relative")}
                    >
                      <LinkPendingIcon />
                      Revisar
                      <span className="sr-only"> el comprobante de {row.holderName}</span>
                    </Link>
                  </td>
                </LinkRow>
              ))}
            </tbody>
          </table>
        }
      />
      <Pagination
        page={cola.page}
        totalPages={Math.max(1, Math.ceil(cola.total / cola.pageSize))}
        buildHref={(p) => pasajerosUrl({ vista: "por-revisar", pagina: p })}
      />
    </div>
  );
}


/**
 * Las otras cuatro vistas: reservas con su viaje, lo pagado y una sola
 * pastilla de estado. Cada fila tiene un único enlace, "Ver detalle".
 */
export async function ReservationList({
  agencyId,
  vista,
  salida,
  buscar,
  page,
  selectedReservationId,
  okCode,
}: {
  agencyId: string;
  vista: Exclude<ReservationView, "por-revisar">;
  salida?: string;
  buscar?: string;
  page: number;
  selectedReservationId?: string;
  /** Código de `?ok=` que se conserva si hay que corregir la página. */
  okCode?: string;
}) {
  const lista = await listAgencyPassengers(agencyId, {
    view: vista,
    departureId: salida,
    search: buscar,
    page,
    pageSize: RESERVATIONS_PAGE_SIZE,
  });

  const paginaValida = lastValidPage(lista.total, lista.pageSize, page);
  if (paginaValida !== page) {
    redirect(
      pasajerosUrl({ vista, salida, buscar, pagina: paginaValida, reserva: selectedReservationId, ok: okCode }),
    );
  }

  if (lista.rows.length === 0) {
    const conFiltros = Boolean(salida || buscar);
    const vacio = EMPTY_BY_VIEW[vista];
    return conFiltros ? (
      <EmptyState
        icon={<IconSearch />}
        title="No hay reservas que coincidan"
        description="Prueba con otra salida o revisa lo que escribiste en la búsqueda."
        action={
          <Link href={pasajerosUrl({ vista })} className={panelButtonClass("secundario")}>
            Quitar los filtros
          </Link>
        }
      />
    ) : (
      <EmptyState
        icon={<IconList />}
        title={vacio.title}
        description={vacio.description}
        action={
          vista === "todas" ? (
            <Link href="/panel/taquilla" className={panelButtonClass("secundario")}>
              Ir a la taquilla
            </Link>
          ) : undefined
        }
      />
    );
  }

  const now = new Date();
  const filas = lista.rows.map((row) => ({
    row,
    href: pasajerosUrl({ vista, salida, buscar, pagina: page, reserva: row.reservationId }),
    situacion: rowSituation(row),
  }));

  return (
    <div className="flex flex-col gap-4">
      <ResultsSummary
        page={lista.page}
        pageSize={lista.pageSize}
        shown={lista.rows.length}
        total={lista.total}
        noun={["reserva", "reservas"]}
      />
      <ResponsiveTable
        cards={
          <>
            {filas.map(({ row, href, situacion }) => {
              const saldo = toDecimal(row.balanceUsd);
              return (
                <LinkCard
                  key={row.reservationId}
                  href={href}
                  title={row.holderName}
                  srPrefix="Ver detalle de la reserva de "
                  badges={<StatusBadge label={situacion.label} tone={situacion.tone} />}
                  idNumber={maskIdNumber(row.holderIdNumber)}
                  code={row.code}
                  trip={<TripLine route={arrowRouteName(row.routeName)} departsAt={row.departsAt} now={now} />}
                  actionLabel="Ver detalle"
                >
                  <span className="tabular text-[15px] text-tinta">
                    Pagado{" "}
                    <span className="whitespace-nowrap font-semibold">{formatMoney(toDecimal(row.paidUsd), "USD")}</span>
                    {saldo.greaterThan(0) ? (
                      <span className="text-tinta-suave">
                        {" "}
                        · Falta <span className="whitespace-nowrap">{formatMoney(saldo, "USD")}</span>
                      </span>
                    ) : null}
                  </span>
                </LinkCard>
              );
            })}
          </>
        }
        table={
          <table className="w-full text-left">
            <thead className="border-b border-borde">
              <tr>
                <th scope="col" className={PANEL_TH_CLASS}>
                  Pasajero
                </th>
                <th scope="col" className={PANEL_TH_CLASS}>
                  Viaje
                </th>
                <th scope="col" className={PANEL_TH_CLASS}>
                  Pagado
                </th>
                <th scope="col" className={PANEL_TH_CLASS}>
                  Estado
                </th>
                <th scope="col" className={PANEL_TH_CLASS}>
                  <span className="sr-only">Acción</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ row, href, situacion }) => (
                <LinkRow
                  key={row.reservationId}
                  selected={row.reservationId === selectedReservationId}
                  className="border-b border-borde last:border-b-0"
                >
                  <td className={PANEL_TD_CLASS}>
                    <span className="block font-semibold">{row.holderName}</span>
                    <HolderIdAndCode idNumber={maskIdNumber(row.holderIdNumber)} code={row.code} />
                    {row.salesChannel === "TAQUILLA" ? (
                      <span className="block text-tinta-suave">Vendida en taquilla</span>
                    ) : null}
                  </td>
                  <td className={PANEL_TD_CLASS}>
                    <span className={ROUTE_CELL_CLASS}>{arrowRouteName(row.routeName)}</span>
                    <span className="tabular block text-tinta-suave">
                      {tripWhenText(row.departsAt, now)} ·{" "}
                      {countLabel(row.passengerCount, "persona", "personas")}
                    </span>
                  </td>
                  <td className={PANEL_TD_CLASS}>
                    <PaymentProgress row={row} />
                  </td>
                  <td className={PANEL_TD_CLASS}>
                    <StatusBadge label={situacion.label} tone={situacion.tone} />
                    {row.ticketIssuedAt ? (
                      <span className="tabular mt-1 block text-tinta-suave">
                        Ticket del {formatCaracas(row.ticketIssuedAt, "dd/MM HH:mm")}
                      </span>
                    ) : null}
                  </td>
                  <td className={`${PANEL_TD_CLASS} text-right`}>
                    <Link
                      href={href}
                      scroll={false}
                      data-row-link
                      className={panelButtonClass("secundario", "md", "relative")}
                    >
                      <LinkPendingIcon />
                      Ver detalle
                      <span className="sr-only"> de la reserva de {row.holderName}</span>
                    </Link>
                  </td>
                </LinkRow>
              ))}
            </tbody>
          </table>
        }
      />
      <Pagination
        page={lista.page}
        totalPages={Math.max(1, Math.ceil(lista.total / lista.pageSize))}
        buildHref={(p) => pasajerosUrl({ vista, salida, buscar, pagina: p })}
      />
    </div>
  );
}
