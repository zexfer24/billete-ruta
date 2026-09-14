import Link from "next/link";
import { notFound } from "next/navigation";
import { balanceUsd, listActivePaymentMethods } from "@/modules/catalog";
import { requirePassenger } from "@/modules/auth";
import { renderQrDataUrl } from "@/modules/tickets";
import { formatMoney } from "@/lib/decimal";
import { formatCaracasDateTime24 } from "@/lib/time";
import { prisma } from "@/lib/prisma";
import { PROOF_STATUS_LABELS, type StatusTone } from "@/lib/labels";
import { Card, Pill, SectionTitle, buttonClass } from "@/components/ui";
import { TicketCard, type TicketCardData } from "@/components/ticket-card";
import { IconDocument, IconUsers } from "@/components/icons";
import PayForm, { type MetodoVM } from "./pay-form";

const ESTADOS_SIN_ABONO = new Set(["LIBERADA", "CANCELADA"]);

const PROOF_TONES: Record<string, StatusTone> = {
  APROBADO: "exito",
  PENDIENTE: "alerta",
  RECHAZADO: "peligro",
};

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

  const [metodosDigitales, qrDataUrl] = await Promise.all([
    puedeAbonar
      ? (await listActivePaymentMethods(reserva.departure.route.agencyId))
          .filter((m) => m.kind === "DIGITAL")
          .map(
            (m): MetodoVM => ({
              id: m.id,
              name: m.name,
              currency: m.currency,
              details: m.details as unknown as MetodoVM["details"],
            }),
          )
      : ([] as MetodoVM[]),
    reserva.ticket ? renderQrDataUrl(reserva.ticket.qrPayload) : Promise.resolve(undefined),
  ]);

  const ticketData: TicketCardData = {
    code: reserva.code,
    origin: reserva.departure.route.origin,
    destination: reserva.departure.route.destination,
    departsAt: reserva.departure.departsAt,
    agencyId: reserva.departure.route.agency.id,
    agencyName: reserva.departure.route.agency.name,
    status: reserva.status,
    totalUsd: reserva.totalUsd.toString(),
    paidUsd: reserva.paidUsd.toString(),
    balanceUsd: saldo.toString(),
    passengerCount: reserva.passengerCount,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/mi/reservas" className="text-sm font-medium text-marca">
          ← Mis viajes
        </Link>
        <h1 className="mt-1 font-mono text-2xl font-extrabold text-tinta">Reserva {reserva.code}</h1>
      </div>

      <TicketCard data={ticketData} size="grande" qrDataUrl={qrDataUrl}>
        {reserva.ticket ? (
          <a
            href={`/api/archivos/${reserva.ticket.pdfPath}`}
            className={buttonClass("secundario", "mt-4 w-full")}
          >
            <IconDocument aria-hidden="true" />
            Descargar PDF
          </a>
        ) : reserva.status === "PAGADA" ? (
          <div className="mt-4">
            <Pill tone="alerta">El ticket se está generando; vuelve en unos minutos.</Pill>
          </div>
        ) : null}
      </TicketCard>

      <Card>
        <SectionTitle>Datos del viaje</SectionTitle>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
          <Dato etiqueta="Agencia" valor={reserva.departure.route.agency.name} />
          <Dato etiqueta="Punto de encuentro" valor={reserva.departure.route.meetingPoint} />
          <Dato etiqueta="Pasajeros" valor={String(reserva.passengerCount)} />
          <Dato etiqueta="Hora de salida" valor={formatCaracasDateTime24(reserva.departure.departsAt)} />
        </dl>
      </Card>

      <section className="flex flex-col gap-3">
        <SectionTitle>Pasajeros</SectionTitle>
        <ul className="flex flex-col gap-2">
          {reserva.passengers.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-tarjeta bg-white p-4 text-sm text-tinta"
            >
              <IconUsers aria-hidden="true" />
              <span className="flex-1 font-medium">{p.fullName}</span>
              {p.isHolder ? <Pill tone="marca">Titular</Pill> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle>Historial de pagos</SectionTitle>
        {reserva.proofs.length === 0 && reserva.cashPayments.length === 0 ? (
          <p className="text-sm text-tinta-suave">Todavía no hay pagos registrados.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {reserva.proofs.map((proof) => (
              <li key={proof.id} className="rounded-tarjeta bg-white p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-tinta">
                    {formatMoney(proof.amount, proof.currency)} — referencia {proof.reference}
                  </span>
                  <Pill tone={PROOF_TONES[proof.status] ?? "neutro"}>
                    {PROOF_STATUS_LABELS[proof.status] ?? proof.status}
                  </Pill>
                </div>
                {proof.status === "RECHAZADO" && proof.rejectionReason ? (
                  <p className="mt-1 text-peligro">Motivo: {proof.rejectionReason}</p>
                ) : null}
              </li>
            ))}
            {reserva.cashPayments.map((pago) => (
              <li key={pago.id} className="rounded-tarjeta bg-white p-4 text-sm text-tinta">
                Cobro en sitio por {formatMoney(pago.amount, pago.currency)} el{" "}
                {formatCaracasDateTime24(pago.collectedAt)}
              </li>
            ))}
          </ul>
        )}
      </section>

      {puedeAbonar ? (
        <Card>
          <SectionTitle>Abonar o completar el pago</SectionTitle>
          <p className="tabular mt-2 text-2xl font-extrabold text-tinta">{formatMoney(saldo, "USD")}</p>
          <p className="text-sm text-tinta-suave">Saldo pendiente</p>
          <div className="mt-4">
            <PayForm reservationId={reserva.id} paymentMethods={metodosDigitales} />
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-tinta-suave">{etiqueta}</dt>
      <dd className="tabular mt-1 font-medium text-tinta">{valor}</dd>
    </div>
  );
}
