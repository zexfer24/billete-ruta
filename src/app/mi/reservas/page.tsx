import Link from "next/link";
import { balanceUsd } from "@/modules/catalog";
import { requirePassenger } from "@/modules/auth";
import { formatMoney } from "@/lib/decimal";
import { formatCaracasDateTime24 } from "@/lib/time";
import { prisma } from "@/lib/prisma";

const ESTADOS: Record<string, string> = {
  PENDIENTE_PAGO: "Pendiente de pago",
  EN_VALIDACION: "En validación",
  ABONADA: "Abonada",
  PAGADA: "Pagada",
  PAGO_EN_SITIO: "Pago en sitio",
  LIBERADA: "Liberada",
  CANCELADA: "Cancelada",
  ABORDADA: "Abordada",
  NO_SHOW: "No se presentó",
};

export default async function MisReservasPage() {
  const pasajero = await requirePassenger();
  const reservas = await prisma.reservation.findMany({
    where: { accountId: pasajero.id },
    include: { departure: { include: { route: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mis reservas</h1>
        <p className="mt-1 text-[var(--color-texto-suave)]">Historial de reservas de tu cuenta.</p>
      </div>

      {reservas.length === 0 ? (
        <p className="text-sm text-[var(--color-texto-suave)]">
          Todavía no tienes reservas.{" "}
          <Link href="/mi/reservar" className="font-medium text-[var(--color-acento)]">
            Reserva tu puesto
          </Link>
          .
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {reservas.map((reserva) => {
            const saldo = balanceUsd(reserva.totalUsd, reserva.paidUsd);
            return (
              <li
                key={reserva.id}
                className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-sm font-semibold">{reserva.code}</p>
                  <span className="rounded-full bg-[var(--color-acento-suave)] px-3 py-1 text-xs font-medium text-[var(--color-acento)]">
                    {ESTADOS[reserva.status] ?? reserva.status}
                  </span>
                </div>
                <p className="mt-2 font-medium">
                  {reserva.departure.route.origin} → {reserva.departure.route.destination}
                </p>
                <p className="tabular text-sm text-[var(--color-texto-suave)]">
                  Salida: {formatCaracasDateTime24(reserva.departure.departsAt)}
                </p>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm tabular">
                  <div>
                    <dt className="text-[var(--color-texto-suave)]">Total</dt>
                    <dd>{formatMoney(reserva.totalUsd, "USD")}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-texto-suave)]">Abonado</dt>
                    <dd>{formatMoney(reserva.paidUsd, "USD")}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-texto-suave)]">Saldo</dt>
                    <dd>{formatMoney(saldo, "USD")}</dd>
                  </div>
                </dl>
                <Link
                  href={`/mi/reservas/${reserva.code}`}
                  className="mt-4 inline-block rounded-lg bg-[var(--color-acento)] px-4 py-2 text-sm font-medium text-white"
                >
                  Ver detalle
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
