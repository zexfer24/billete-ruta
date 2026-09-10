import Link from "next/link";
import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/decimal";
import { maskIdNumber } from "@/lib/identity";
import { formatCaracasDateTime24 } from "@/lib/time";
import { approveProofAction, cashPaymentAction, rejectProofAction } from "./actions";

/** Comprobantes por página: la cola se revisa de a poco, del más viejo al más nuevo. */
const POR_PAGINA = 25;

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const user = await requirePanelUser("payments.review");
  const agencyId = requireAgencyScope(user);
  const { pagina } = await searchParams;
  const paginaActual = Math.max(1, Number.parseInt(pagina ?? "1", 10) || 1);

  const where = {
    status: "PENDIENTE" as const,
    reservation: { departure: { route: { agencyId } } },
  };

  const [comprobantes, total] = await Promise.all([
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
  ]);

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

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

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Comprobantes pendientes</h2>

        {comprobantes.length === 0 ? (
          <p className="text-sm text-[var(--color-texto-suave)]">
            No hay comprobantes por revisar.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="border-b border-[var(--color-borde)] text-[var(--color-texto-suave)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Serial</th>
                    <th className="px-4 py-3 font-medium">Titular</th>
                    <th className="px-4 py-3 font-medium">Salida</th>
                    <th className="px-4 py-3 font-medium">Declarado</th>
                    <th className="px-4 py-3 font-medium">En dólares</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Saldo</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {comprobantes.map((c) => {
                    const saldo = c.reservation.totalUsd.sub(c.reservation.paidUsd);
                    return (
                      <tr
                        key={c.id}
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
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={`/api/archivos/${c.imagePath}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[var(--color-acento)] underline"
                            >
                              Ver
                            </a>
                            <form action={approveProofAction}>
                              <input type="hidden" name="proofId" value={c.id} />
                              <button
                                type="submit"
                                className="rounded-lg bg-[var(--color-exito)] px-3 py-1.5 text-xs font-medium text-white"
                              >
                                Aprobar
                              </button>
                            </form>
                            <details className="relative">
                              <summary className="cursor-pointer list-none rounded-lg bg-[var(--color-peligro)] px-3 py-1.5 text-xs font-medium text-white">
                                Rechazar
                              </summary>
                              <form
                                action={rejectProofAction}
                                className="mt-2 flex items-center gap-2"
                              >
                                <input type="hidden" name="proofId" value={c.id} />
                                <input
                                  type="text"
                                  name="reason"
                                  placeholder="Motivo del rechazo"
                                  required
                                  minLength={4}
                                  className="w-44 rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)] px-2 py-1.5 text-xs"
                                />
                                <button
                                  type="submit"
                                  className="rounded-lg bg-[var(--color-peligro)] px-3 py-1.5 text-xs font-medium text-white"
                                >
                                  Confirmar
                                </button>
                              </form>
                            </details>
                          </div>
                        </td>
                      </tr>
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
    </div>
  );
}
