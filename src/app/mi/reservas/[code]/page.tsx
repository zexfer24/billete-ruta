import Link from "next/link";
import { notFound } from "next/navigation";
import { balanceUsd, listActivePaymentMethods } from "@/modules/catalog";
import { requirePassenger } from "@/modules/auth";
import { formatMoney } from "@/lib/decimal";
import { formatCaracasDateTime24 } from "@/lib/time";
import { prisma } from "@/lib/prisma";
import PayForm, { type MetodoVM } from "./pay-form";

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

const PROOF_ESTADOS: Record<string, string> = {
  PENDIENTE: "Pendiente de revisión",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};

const ESTADOS_SIN_ABONO = new Set(["LIBERADA", "CANCELADA"]);

export default async function DetalleReservaPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const pasajero = await requirePassenger();
  const { code } = await params;

  const reserva = await prisma.reservation.findUnique({
    where: { code },
    include: {
      departure: { include: { route: { include: { agency: true } } } },
      passengers: true,
      proofs: { orderBy: { createdAt: "desc" } },
      cashPayments: { orderBy: { collectedAt: "desc" } },
      ticket: true,
    },
  });

  if (!reserva || reserva.accountId !== pasajero.id) {
    notFound();
  }

  const saldo = balanceUsd(reserva.totalUsd, reserva.paidUsd);
  const puedeAbonar = saldo.greaterThan(0) && !ESTADOS_SIN_ABONO.has(reserva.status);

  const metodosDigitales: MetodoVM[] = puedeAbonar
    ? (await listActivePaymentMethods(reserva.departure.route.agencyId))
        .filter((m) => m.kind === "DIGITAL")
        .map((m) => ({
          id: m.id,
          name: m.name,
          currency: m.currency,
          details: m.details as unknown as MetodoVM["details"],
        }))
    : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/mi/reservas" className="text-sm text-[var(--color-acento)]">
          ← Volver a mis reservas
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Reserva {reserva.code}</h1>
        <p className="mt-1 text-[var(--color-texto-suave)]">
          {reserva.departure.route.origin} → {reserva.departure.route.destination} ·{" "}
          {formatCaracasDateTime24(reserva.departure.departsAt)}
        </p>
      </div>

      <dl className="grid gap-4 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-6 sm:grid-cols-4">
        <Dato etiqueta="Estado" valor={ESTADOS[reserva.status] ?? reserva.status} />
        <Dato etiqueta="Pasajeros" valor={String(reserva.passengerCount)} />
        <Dato etiqueta="Total" valor={formatMoney(reserva.totalUsd, "USD")} />
        <Dato etiqueta="Abonado" valor={formatMoney(reserva.paidUsd, "USD")} />
        <Dato etiqueta="Saldo" valor={formatMoney(saldo, "USD")} />
        <Dato etiqueta="Agencia" valor={reserva.departure.route.agency.name} />
        <Dato etiqueta="Punto de encuentro" valor={reserva.departure.route.meetingPoint} />
      </dl>

      <section>
        <h2 className="font-semibold">Pasajeros</h2>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {reserva.passengers.map((p) => (
            <li
              key={p.id}
              className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 py-2 text-sm"
            >
              {p.fullName} {p.isHolder ? "(titular)" : ""}
            </li>
          ))}
        </ul>
      </section>

      {reserva.ticket ? (
        <section className="rounded-xl border border-[var(--color-exito)] bg-[var(--color-superficie)] p-6">
          <p className="font-medium text-[var(--color-exito)]">Tu ticket está listo.</p>
          <a
            href={`/api/archivos/${reserva.ticket.pdfPath}`}
            className="mt-3 inline-block rounded-lg bg-[var(--color-exito)] px-5 py-3 font-medium text-white"
          >
            Descargar ticket (PDF)
          </a>
        </section>
      ) : reserva.status === "PAGADA" ? (
        <section className="rounded-xl border border-[var(--color-alerta)] bg-[var(--color-superficie)] p-6">
          <p className="text-sm text-[var(--color-alerta)]">
            Tu reserva está pagada. El ticket se está generando; vuelve a esta página en unos
            minutos.
          </p>
        </section>
      ) : null}

      <section>
        <h2 className="font-semibold">Historial de pagos</h2>
        {reserva.proofs.length === 0 && reserva.cashPayments.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-texto-suave)]">
            Todavía no hay pagos registrados.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {reserva.proofs.map((proof) => (
              <li
                key={proof.id}
                className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 py-3 text-sm"
              >
                Comprobante por {formatMoney(proof.amount, proof.currency)} — referencia{" "}
                {proof.reference} — {PROOF_ESTADOS[proof.status] ?? proof.status}
                {proof.status === "RECHAZADO" && proof.rejectionReason ? (
                  <span className="block text-[var(--color-peligro)]">
                    Motivo: {proof.rejectionReason}
                  </span>
                ) : null}
              </li>
            ))}
            {reserva.cashPayments.map((pago) => (
              <li
                key={pago.id}
                className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 py-3 text-sm"
              >
                Cobro en sitio por {formatMoney(pago.amount, pago.currency)} el{" "}
                {formatCaracasDateTime24(pago.collectedAt)}
              </li>
            ))}
          </ul>
        )}
      </section>

      {puedeAbonar ? (
        <section className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-6">
          <h2 className="font-semibold">Abonar o completar el pago</h2>
          <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
            Saldo pendiente: {formatMoney(saldo, "USD")}
          </p>
          <div className="mt-4">
            <PayForm reservationId={reserva.id} paymentMethods={metodosDigitales} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-[var(--color-texto-suave)]">
        {etiqueta}
      </dt>
      <dd className="tabular mt-1 font-medium">{valor}</dd>
    </div>
  );
}
