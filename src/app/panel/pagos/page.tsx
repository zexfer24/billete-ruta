import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ProofStatus } from "@prisma/client";
import { ForbiddenError, requireAgencyUser } from "@/modules/auth";
import { getProofReview, proofCoverage, type ProofCoverage, type ProofReview } from "@/modules/payments";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/decimal";
import { maskIdNumber } from "@/lib/identity";
import { formatCaracasDateTime24 } from "@/lib/time";
import { SidePanel } from "@/components/side-panel";
import { ClickableRow } from "@/components/clickable-row";
import { PanelFeedback } from "@/components/panel-feedback";
import { approveProofAction, cashPaymentAction, rejectProofAction } from "./actions";

/** Comprobantes por página: la cola se revisa de a poco, del más viejo al más nuevo. */
const POR_PAGINA = 25;

const ESTADO_COMPROBANTE_LABEL: Record<ProofStatus, string> = {
  PENDIENTE: "Pendiente",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};

/** Traduce el código corto de `?ok=` a un texto. Un código desconocido no muestra nada. */
const OK_LABELS: Record<string, string> = {
  aprobado: "Pago aprobado.",
  rechazado: "Comprobante rechazado.",
  cobro: "Cobro registrado.",
  "cobro-ticket": "Cobro registrado. El saldo quedó en cero y se emitió el ticket.",
};

function coverageBadge(coverage: ProofCoverage): { text: string; className: string } {
  switch (coverage.kind) {
    case "ABONO_PARCIAL":
      return { text: "Abono parcial", className: "bg-[var(--color-acento-suave)]" };
    case "PAGO_COMPLETO":
      return { text: "Completa el pago", className: "text-[var(--color-exito)]" };
    case "EXCEDE_SALDO":
      return {
        text: `Excede el saldo en ${formatMoney(coverage.excessUsd, "USD")}`,
        className: "text-[var(--color-alerta)]",
      };
  }
}

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; comprobante?: string; error?: string; ok?: string }>;
}) {
  const { agencyId } = await requireAgencyUser("payments.review");
  const { pagina, comprobante, error, ok } = await searchParams;
  const paginaActual = Math.max(1, Number.parseInt(pagina ?? "1", 10) || 1);
  const comprobanteParsed = z.string().uuid().safeParse(comprobante);
  const comprobanteId = comprobanteParsed.success ? comprobanteParsed.data : undefined;

  function buildHref(id?: string): string {
    const params = new URLSearchParams();
    if (paginaActual > 1) params.set("pagina", String(paginaActual));
    if (id) params.set("comprobante", id);
    const query = params.toString();
    return query ? `/panel/pagos?${query}` : "/panel/pagos";
  }

  const where = {
    status: "PENDIENTE" as const,
    reservation: { departure: { route: { agencyId } } },
  };

  const [comprobantes, total, review] = await Promise.all([
    prisma.paymentProof.findMany({
      where,
      include: {
        reservation: {
          include: { account: true, departure: { include: { route: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
      skip: (paginaActual - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.paymentProof.count({ where }),
    comprobanteId
      ? getProofReview(comprobanteId, agencyId).catch((error: unknown) => {
          if (error instanceof ForbiddenError) return null;
          throw error;
        })
      : Promise.resolve(null),
  ]);

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  // Si la página pedida quedó vacía (por ejemplo, tras aprobar o rechazar el
  // último comprobante de la última página, o por una URL escrita a mano),
  // redirige a la última página válida sin arrastrar el `comprobante`.
  if (total > 0 && paginaActual > paginas) {
    const params = new URLSearchParams();
    if (paginas > 1) params.set("pagina", String(paginas));
    const query = params.toString();
    redirect(query ? `/panel/pagos?${query}` : "/panel/pagos");
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Pagos</h1>
        <p className="text-sm text-[var(--color-texto-suave)]">
          {total === 0
            ? "Sin comprobantes por revisar"
            : `${total} comprobante(s) por revisar`}
        </p>
      </div>

      <PanelFeedback error={comprobanteId ? undefined : error} ok={ok ? OK_LABELS[ok] : undefined} />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Comprobantes pendientes</h2>

        {comprobantes.length === 0 ? (
          <p className="text-sm text-[var(--color-texto-suave)]">
            No hay comprobantes por revisar.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="border-b border-[var(--color-borde)] text-[var(--color-texto-suave)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Serial</th>
                    <th className="px-4 py-3 font-medium">Titular</th>
                    <th className="px-4 py-3 font-medium">Salida</th>
                    <th className="px-4 py-3 font-medium">Declarado</th>
                    <th className="px-4 py-3 font-medium">En dólares</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Saldo</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {comprobantes.map((c) => {
                    const saldo = c.reservation.totalUsd.sub(c.reservation.paidUsd);
                    const coverage = proofCoverage(
                      c.reservation.totalUsd,
                      c.reservation.paidUsd,
                      c.amountUsd,
                    );
                    const badge = coverageBadge(coverage);
                    const href = buildHref(c.id);
                    return (
                      <ClickableRow
                        key={c.id}
                        href={href}
                        selected={c.id === comprobanteId}
                        className="border-b border-[var(--color-borde)] last:border-b-0 align-top"
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium">{c.reservation.code}</span>
                          <span className="block text-xs text-[var(--color-texto-suave)]">
                            Ref. {c.reference}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {c.reservation.account.fullName}
                          <span className="block text-xs text-[var(--color-texto-suave)]">
                            {maskIdNumber(c.reservation.account.idNumber)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {c.reservation.departure.route.name}
                          <span className="tabular block text-xs text-[var(--color-texto-suave)]">
                            {formatCaracasDateTime24(c.reservation.departure.departsAt)}
                          </span>
                        </td>
                        <td className="tabular px-4 py-3">{formatMoney(c.amount, c.currency)}</td>
                        <td className="tabular px-4 py-3">{formatMoney(c.amountUsd, "USD")}</td>
                        <td className="tabular px-4 py-3">
                          {formatMoney(c.reservation.totalUsd, "USD")}
                        </td>
                        <td className="tabular px-4 py-3 font-medium">
                          {formatMoney(saldo, "USD")}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                          >
                            {badge.text}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={href}
                            scroll={false}
                            className="rounded-lg bg-[var(--color-acento)] px-3 py-1.5 text-xs font-medium text-white"
                          >
                            Revisar
                          </Link>
                        </td>
                      </ClickableRow>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {paginas > 1 ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-texto-suave)]">
                  Página {paginaActual} de {paginas}
                </span>
                <div className="flex gap-2">
                  {paginaActual > 1 ? (
                    <Link
                      href={`/panel/pagos?pagina=${paginaActual - 1}`}
                      className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-1.5 font-medium"
                    >
                      Anterior
                    </Link>
                  ) : null}
                  {paginaActual < paginas ? (
                    <Link
                      href={`/panel/pagos?pagina=${paginaActual + 1}`}
                      className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-1.5 font-medium"
                    >
                      Siguiente
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="flex flex-col gap-4 border-t border-[var(--color-borde)] pt-8">
        <h2 className="text-lg font-semibold">Registrar cobro en efectivo</h2>
        <form action={cashPaymentAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="pagina" value={paginaActual} />
          <label className="flex flex-col gap-1 text-sm font-medium">
            Serial del ticket
            <input
              type="text"
              name="code"
              required
              placeholder="TR-0911-3PAX-Y962"
              className="w-56 rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm uppercase"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Monto
            <input
              type="text"
              name="amount"
              required
              inputMode="decimal"
              className="w-32 rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Moneda
            <select
              name="currency"
              className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
            >
              <option value="USD">USD</option>
              <option value="VES">VES</option>
              <option value="COP">COP</option>
              <option value="USDT">USDT</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-[var(--color-acento)] px-5 py-2.5 text-sm font-medium text-white"
          >
            Registrar cobro
          </button>
        </form>
      </section>

      {review ? (
        <PanelComprobante
          review={review}
          pagina={paginaActual}
          closeHref={buildHref()}
          error={comprobanteId ? error : undefined}
        />
      ) : null}
    </div>
  );
}

function PanelComprobante({
  review,
  pagina,
  closeHref,
  error,
}: {
  review: ProofReview;
  pagina: number;
  closeHref: string;
  error?: string;
}) {
  const { proof, reservation, coverage, history } = review;
  const badge = coverage ? coverageBadge(coverage) : null;

  return (
    <SidePanel
      title={`Comprobante ${reservation.code}`}
      subtitle={`${reservation.holderName} · ${maskIdNumber(reservation.holderIdNumber)}`}
      closeHref={closeHref}
    >
      <div className="flex flex-col gap-6">
        <PanelFeedback error={error} />
        {badge ? (
          <span
            className={`inline-block w-fit rounded-full px-3 py-1 text-sm font-medium ${badge.className}`}
          >
            {badge.text}
          </span>
        ) : null}

        <div>
          <a href={`/api/archivos/${proof.imagePath}`} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/archivos/${proof.imagePath}`}
              alt={`Comprobante de pago, referencia ${proof.reference}`}
              className="max-h-[60vh] w-full rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)] object-contain"
            />
          </a>
          <p className="mt-1 text-xs text-[var(--color-texto-suave)]">
            Haz clic en la imagen para verla en tamaño completo.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold tracking-tight">Datos del pago</h3>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="font-medium text-[var(--color-texto-suave)]">Referencia</dt>
            <dd>{proof.reference}</dd>
            <dt className="font-medium text-[var(--color-texto-suave)]">Método</dt>
            <dd>{proof.paymentMethodName}</dd>
            <dt className="font-medium text-[var(--color-texto-suave)]">Monto declarado</dt>
            <dd className="tabular">{formatMoney(proof.amount, proof.currency)}</dd>
            <dt className="font-medium text-[var(--color-texto-suave)]">En dólares</dt>
            <dd className="tabular">{formatMoney(proof.amountUsd, "USD")}</dd>
            <dt className="font-medium text-[var(--color-texto-suave)]">Cargado el</dt>
            <dd className="tabular">{formatCaracasDateTime24(proof.createdAt)}</dd>
          </dl>
        </div>

        <div>
          <h3 className="text-sm font-semibold tracking-tight">Reserva</h3>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="font-medium text-[var(--color-texto-suave)]">Serial</dt>
            <dd>{reservation.code}</dd>
            <dt className="font-medium text-[var(--color-texto-suave)]">Ruta</dt>
            <dd>
              {reservation.routeName} ({reservation.origin} → {reservation.destination})
            </dd>
            <dt className="font-medium text-[var(--color-texto-suave)]">Salida</dt>
            <dd className="tabular">{formatCaracasDateTime24(reservation.departsAt)}</dd>
            <dt className="font-medium text-[var(--color-texto-suave)]">Pasajeros</dt>
            <dd>{reservation.passengerCount}</dd>
            <dt className="font-medium text-[var(--color-texto-suave)]">Estado de la reserva</dt>
            <dd>{reservation.status}</dd>
          </dl>
        </div>

        {coverage ? (
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Cuentas</h3>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="font-medium text-[var(--color-texto-suave)]">Total de la reserva</dt>
              <dd className="tabular">{formatMoney(reservation.totalUsd, "USD")}</dd>
              <dt className="font-medium text-[var(--color-texto-suave)]">Pagado antes</dt>
              <dd className="tabular">{formatMoney(reservation.paidUsd, "USD")}</dd>
              <dt className="font-medium text-[var(--color-texto-suave)]">Este comprobante (USD)</dt>
              <dd className="tabular">{formatMoney(proof.amountUsd, "USD")}</dd>
              <dt className="font-medium text-[var(--color-texto-suave)]">Saldo tras aprobar</dt>
              <dd className="tabular font-semibold">
                {formatMoney(coverage.balanceAfterUsd, "USD")}
              </dd>
            </dl>
          </div>
        ) : null}

        <div>
          <h3 className="text-sm font-semibold tracking-tight">
            Historial de pagos de esta reserva
          </h3>
          {history.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--color-texto-suave)]">
              Sin pagos anteriores en esta reserva.
            </p>
          ) : (
            <div className="mt-2 overflow-x-auto rounded-lg border border-[var(--color-borde)]">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--color-borde)] text-xs uppercase tracking-wide text-[var(--color-texto-suave)]">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Monto</th>
                    <th className="px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="border-b border-[var(--color-borde)] last:border-0">
                      <td className="tabular px-3 py-2">{formatCaracasDateTime24(item.at)}</td>
                      <td className="px-3 py-2">
                        {item.kind === "COMPROBANTE" ? "Comprobante" : "Efectivo"}
                      </td>
                      <td className="tabular px-3 py-2">
                        {formatMoney(item.amount, item.currency)}
                        {item.currency !== "USD" ? (
                          <span className="block text-xs text-[var(--color-texto-suave)]">
                            {formatMoney(item.amountUsd, "USD")}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        {item.kind === "EFECTIVO" ? (
                          "Cobrado"
                        ) : (
                          <>
                            {ESTADO_COMPROBANTE_LABEL[item.status as ProofStatus]}
                            {item.status === "RECHAZADO" && item.rejectionReason ? (
                              <span className="block text-xs text-[var(--color-texto-suave)]">
                                {item.rejectionReason}
                              </span>
                            ) : null}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {proof.status === "PENDIENTE" ? (
          <div className="flex flex-col gap-3 border-t border-[var(--color-borde)] pt-6 sm:flex-row sm:items-start">
            <form action={approveProofAction}>
              <input type="hidden" name="proofId" value={proof.id} />
              <input type="hidden" name="pagina" value={pagina} />
              <button
                type="submit"
                className="rounded-lg bg-[var(--color-exito)] px-4 py-2 text-sm font-medium text-white"
              >
                Aprobar pago
              </button>
            </form>
            <form action={rejectProofAction} className="flex flex-1 flex-col gap-2">
              <input type="hidden" name="proofId" value={proof.id} />
              <input type="hidden" name="pagina" value={pagina} />
              <label className="flex flex-col gap-1 text-sm font-medium">
                Motivo del rechazo
                <textarea
                  name="reason"
                  required
                  minLength={4}
                  rows={2}
                  className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
                />
              </label>
              <button
                type="submit"
                className="w-fit rounded-lg bg-[var(--color-peligro)] px-4 py-2 text-sm font-medium text-white"
              >
                Rechazar
              </button>
            </form>
          </div>
        ) : (
          <p className="border-t border-[var(--color-borde)] pt-6 text-sm text-[var(--color-texto-suave)]">
            Este comprobante ya fue {proof.status === "APROBADO" ? "aprobado" : "rechazado"} el{" "}
            {proof.reviewedAt ? formatCaracasDateTime24(proof.reviewedAt) : "—"}.
            {proof.status === "RECHAZADO" && proof.rejectionReason
              ? ` Motivo: ${proof.rejectionReason}`
              : ""}
          </p>
        )}
      </div>
    </SidePanel>
  );
}
