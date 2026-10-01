import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listAgencyPassengers, listPendingProofQueue } from "@/modules/reports";
import type { AgencyPassengerRow, ReservationView } from "@/modules/reports";
import type { ProofCoverage } from "@/modules/payments";
import { formatMoney, toDecimal } from "@/lib/decimal";
import { maskIdNumber } from "@/lib/identity";
import { formatCaracas, formatCaracasDateTime24 } from "@/lib/time";
import { departureStatusLabel, reservationStatusLabel, reservationStatusTone, type StatusTone } from "@/lib/labels";
import {
  EmptyState,
  MobileCard,
  PANEL_TD_CLASS,
  PANEL_TH_CLASS,
  ProgressBar,
  StatusBadge,
  panelButtonClass,
} from "@/components/panel-ui";
import { IconCheckCircle, IconChevronLeft, IconChevronRight, IconList, IconSearch } from "@/components/icons";
import { countLabel } from "../_dashboard/text";
import { coverageBadge } from "./proof-review";
import { lastValidPage, pasajerosUrl } from "./urls";
import { showsUsdEquivalent } from "./money";
import { LinkPendingIcon, LinkRow } from "./link-pending";
import { ResponsiveTable } from "../_dashboard/responsive-table";

/**
 * Filas por página: el mismo tamaño en todas las vistas, para que al cambiar
 * de pestaña la lista no cambie de largo sin razón visible.
 */
export const RESERVATIONS_PAGE_SIZE = 25;
export const PROOFS_PAGE_SIZE = 25;

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
 * Cómo queda la reserva si se aprueba el comprobante, el mismo dato que el
 * panel lateral llama "Saldo después". No se muestra el saldo de antes: junto
 * a "Completa el pago" parecía que el pasajero seguía debiendo ese monto.
 */
function afterApproval(coverage: ProofCoverage): string {
  return coverage.balanceAfterUsd.greaterThan(0)
    ? `Quedan ${formatMoney(coverage.balanceAfterUsd, "USD")} por pagar`
    : "Queda pagada";
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
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
 * Subtítulo de la tarjeta del teléfono: la pastilla de estado en su propia
 * fila bajo el nombre (al lado del título le quitaba ancho y partía el nombre
 * y el código), luego la cédula, el código y el viaje en una sola línea. Así
 * la cuadrícula queda con los dos montos que se comparan.
 */
function CardSubtitle({
  badge,
  idNumber,
  code,
  trip,
}: {
  badge: ReactNode;
  idNumber: string;
  code: string;
  trip: string;
}) {
  return (
    <>
      <span className="my-1.5 block">{badge}</span>
      <HolderIdAndCode idNumber={idNumber} code={code} />
      <span className="tabular block">{trip}</span>
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
 * Vista "Por revisar": la cola de comprobantes pendientes, del más antiguo al
 * más nuevo. Cada fila tiene un solo enlace, "Revisar", que abre el panel
 * lateral; el resto de la fila lleva al mismo lugar con el ratón.
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
  const cola = await listPendingProofQueue(agencyId, { page, pageSize: PROOFS_PAGE_SIZE });

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
            {filas.map(({ row, href, badge }) => (
              <MobileCard
                key={row.proofId}
                title={row.holderName}
                subtitle={
                  <CardSubtitle
                    badge={<StatusBadge label={badge.label} tone={badge.tone} />}
                    idNumber={row.maskedHolderIdNumber}
                    code={row.code}
                    trip={`${row.routeName} · ${formatCaracasDateTime24(row.departsAt)}`}
                  />
                }
                details={[
                  {
                    label: "Monto enviado",
                    value: <SentAmount amount={row.amount} currency={row.currency} amountUsd={row.amountUsd} />,
                  },
                  { label: "Si lo apruebas", value: afterApproval(row.coverage) },
                ]}
                action={
                  <Link href={href} scroll={false} className={panelButtonClass("secundario", "md", "relative w-full")}>
                    <LinkPendingIcon />
                    Revisar comprobante
                  </Link>
                }
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
              {filas.map(({ row, href, badge }) => (
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
                    <span className="block">{row.routeName}</span>
                    <span className="tabular block text-tinta-suave">{formatCaracasDateTime24(row.departsAt)}</span>
                    {row.departureStatus !== "PROGRAMADA" ? (
                      <span className="block text-alerta">Salida: {departureStatusLabel(row.departureStatus)}</span>
                    ) : null}
                  </td>
                  <td className={PANEL_TD_CLASS}>
                    <SentAmount amount={row.amount} currency={row.currency} amountUsd={row.amountUsd} strong />
                    <span className="block text-tinta-suave">
                      Referencia <span className="tabular whitespace-nowrap">{row.reference}</span>
                    </span>
                  </td>
                  <td className={PANEL_TD_CLASS}>
                    <StatusBadge label={badge.label} tone={badge.tone} />
                    <span className="tabular mt-1 block text-tinta-suave">
                      Si lo apruebas: {lowerFirst(afterApproval(row.coverage))}
                    </span>
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
            {filas.map(({ row, href, situacion }) => (
              <MobileCard
                key={row.reservationId}
                title={row.holderName}
                subtitle={
                  <CardSubtitle
                    badge={<StatusBadge label={situacion.label} tone={situacion.tone} />}
                    idNumber={maskIdNumber(row.holderIdNumber)}
                    code={row.code}
                    trip={`${row.routeName} · ${formatCaracasDateTime24(row.departsAt)}`}
                  />
                }
                details={[
                  { label: "Pagado", value: formatMoney(toDecimal(row.paidUsd), "USD") },
                  { label: "Falta", value: formatMoney(toDecimal(row.balanceUsd), "USD") },
                ]}
                action={
                  <Link href={href} scroll={false} className={panelButtonClass("secundario", "md", "relative w-full")}>
                    <LinkPendingIcon />
                    Ver detalle
                  </Link>
                }
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
                    <span className="block">{row.routeName}</span>
                    <span className="tabular block text-tinta-suave">
                      {formatCaracasDateTime24(row.departsAt)} ·{" "}
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
