import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/decimal";
import { approveProofAction, cashPaymentAction, rejectProofAction } from "./actions";

export default async function PagosPage() {
  const user = await requirePanelUser("payments.review");
  const agencyId = requireAgencyScope(user);

  const comprobantes = await prisma.paymentProof.findMany({
    where: { status: "PENDIENTE", reservation: { departure: { route: { agencyId } } } },
    include: { reservation: { include: { departure: { include: { route: true } } } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-2xl font-semibold tracking-tight">Pagos</h1>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Comprobantes pendientes</h2>

        {comprobantes.length === 0 ? (
          <p className="text-sm text-[var(--color-texto-suave)]">No hay comprobantes por revisar.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {comprobantes.map((c) => {
              const saldo = c.reservation.totalUsd.sub(c.reservation.paidUsd);
              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{c.reservation.code}</p>
                      <p className="text-sm text-[var(--color-texto-suave)]">Referencia: {c.reference}</p>
                      <a
                        href={`/api/archivos/${c.imagePath}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-sm text-[var(--color-acento)] underline"
                      >
                        Ver comprobante
                      </a>
                    </div>
                    <dl className="tabular grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <dt className="text-[var(--color-texto-suave)]">Declarado</dt>
                      <dd>{formatMoney(c.amount, c.currency)}</dd>
                      <dt className="text-[var(--color-texto-suave)]">Equivalente USD</dt>
                      <dd>{formatMoney(c.amountUsd, "USD")}</dd>
                      <dt className="text-[var(--color-texto-suave)]">Total de la reserva</dt>
                      <dd>{formatMoney(c.reservation.totalUsd, "USD")}</dd>
                      <dt className="text-[var(--color-texto-suave)]">Ya abonado</dt>
                      <dd>{formatMoney(c.reservation.paidUsd, "USD")}</dd>
                      <dt className="text-[var(--color-texto-suave)]">Saldo</dt>
                      <dd>{formatMoney(saldo, "USD")}</dd>
                    </dl>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <form action={approveProofAction}>
                      <input type="hidden" name="proofId" value={c.id} />
                      <button
                        type="submit"
                        className="rounded-lg bg-[var(--color-exito)] px-4 py-2 text-sm font-medium text-white"
                      >
                        Aprobar
                      </button>
                    </form>
                    <form action={rejectProofAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="proofId" value={c.id} />
                      <input
                        type="text"
                        name="reason"
                        placeholder="Motivo del rechazo"
                        required
                        minLength={4}
                        className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)] px-3 py-2 text-sm"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-[var(--color-peligro)] px-4 py-2 text-sm font-medium text-white"
                      >
                        Rechazar
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
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
              className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm uppercase"
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
