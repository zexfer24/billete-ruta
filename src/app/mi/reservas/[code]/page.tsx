import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import type { Currency, Prisma } from "@prisma/client";
import { RESERVATION_CODE_PATTERN } from "@/modules/booking";
import { balanceUsd, getCurrentExchangeRate, listActivePaymentMethods } from "@/modules/catalog";
import { requirePassenger } from "@/modules/auth";
import { renderQrDataUrl } from "@/modules/tickets";
import { formatMoney, round2, ZERO } from "@/lib/decimal";
import { formatCaracasDate, formatCaracasTime24 } from "@/lib/time";
import { prisma } from "@/lib/prisma";
import { PROOF_STATUS_LABELS } from "@/lib/labels";
import { Alert } from "@/components/alert";
import { ClearFeedbackParams } from "@/components/clear-feedback-params";
import { buttonClass, Card, Pill, SectionTitle, type PillTone } from "@/components/ui";
import { TicketCard, type TicketCardData } from "@/components/ticket-card";
import { IconArrowLeft, IconDownload, IconMapPin, IconUser } from "@/components/icons";
import { capitalize, currencyName, whenPhrase } from "@/components/passenger-copy";
import { ClearBookingDraft } from "../../_components/clear-booking-draft";
import { AutoRefresh } from "./auto-refresh";
import PayForm, { type MetodoVM } from "./pay-form";

export const metadata: Metadata = {
  title: "Detalle del viaje",
};

/** Estados en los que el módulo de pagos acepta un comprobante (`CAN_SUBMIT_PROOF`). */
const ESTADOS_CON_COMPROBANTE = new Set(["PENDIENTE_PAGO", "ABONADA", "EN_VALIDACION", "PAGO_EN_SITIO"]);

/** Una reserva de pago en taquilla se libera si no se paga 12 horas antes de salir. */
const HORAS_LIMITE_TAQUILLA = 12;

const PROOF_TONES: Record<string, PillTone> = {
  APROBADO: "exito",
  PENDIENTE: "info",
  RECHAZADO: "peligro",
};

/** Moneda que se cotiza a la par del dólar. */
function esDolar(currency: Currency): boolean {
  return currency === "USD" || currency === "USDT";
}

function fechaHora(date: Date): string {
  return `${formatCaracasDate(date)} a las ${formatCaracasTime24(date)}`;
}

function pasajerosTexto(cantidad: number): string {
  return cantidad === 1 ? "1 pasajero" : `${cantidad} pasajeros`;
}

interface MovimientoVM {
  id: string;
  at: Date;
  amount: string;
  description: string;
  status: { label: string; tone: PillTone };
  note: string | null;
}

/**
 * Detalle de una reserva del pasajero (spec 7.1). El orden sigue a lo que
 * toca hacer: el ticket (con el QR si ya está pagado), justo debajo la acción
 * de pago que corresponde al estado, y después los datos del viaje, quiénes
 * viajan y los pagos registrados. Una reserva ajena o inexistente muestra la
 * página "No encontramos ese viaje".
 */
export default async function DetalleReservaPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const pasajero = await requirePassenger();
  const { code: rawCode } = await params;
  const { ok } = await searchParams;
  const code = rawCode.trim().toUpperCase();

  if (!RESERVATION_CODE_PATTERN.test(code)) {
    notFound();
  }

  const reserva = await prisma.reservation.findUnique({
    where: { code },
    include: {
      departure: { include: { route: { include: { agency: true } } } },
      passengers: true,
      proofs: { orderBy: { createdAt: "desc" }, include: { paymentMethod: { select: { name: true } } } },
      cashPayments: { orderBy: { collectedAt: "desc" } },
      ticket: true,
    },
  });

  if (!reserva || reserva.accountId !== pasajero.id) {
    notFound();
  }

  const now = new Date();
  const agencia = reserva.departure.route.agency;
  const ruta = reserva.departure.route;
  const salida = reserva.departure.departsAt;
  const saldo = balanceUsd(reserva.totalUsd, reserva.paidUsd);
  const saldoTexto = formatMoney(saldo, "USD");
  // Lo enviado que la agencia aún no revisa: permite decir si alcanzará para completar el pago.
  const enRevisionUsd = reserva.proofs
    .filter((proof) => proof.status === "PENDIENTE")
    .reduce((suma, proof) => suma.add(proof.amountUsd), ZERO);
  const faltaria = balanceUsd(saldo, enRevisionUsd);
  const yaSalio = salida <= now;
  const puedeEnviarComprobante =
    saldo.greaterThan(0) && ESTADOS_CON_COMPROBANTE.has(reserva.status) && !yaSalio;
  const recienCreada = ok === "reserva-creada";
  const limiteTaquilla = new Date(salida.getTime() - HORAS_LIMITE_TAQUILLA * 3_600_000);

  const [metodosDigitales, qrDataUrl] = await Promise.all([
    puedeEnviarComprobante ? metodosConSaldo(agencia.id, saldo, reserva) : Promise.resolve([] as MetodoVM[]),
    reserva.ticket ? renderQrDataUrl(reserva.ticket.qrPayload) : Promise.resolve(undefined),
  ]);

  const ticketData: TicketCardData = {
    code: reserva.code,
    origin: ruta.origin,
    destination: ruta.destination,
    departsAt: salida,
    agencyId: agencia.id,
    agencyName: agencia.name,
    status: reserva.status,
    totalUsd: reserva.totalUsd.toString(),
    paidUsd: reserva.paidUsd.toString(),
    balanceUsd: saldo.toString(),
    passengerCount: reserva.passengerCount,
  };

  const movimientos: MovimientoVM[] = [
    ...reserva.proofs.map((proof) => ({
      id: proof.id,
      at: proof.createdAt,
      amount: formatMoney(proof.amount, proof.currency),
      description: `Comprobante con ${proof.paymentMethod.name}, referencia ${proof.reference}`,
      status: {
        label: PROOF_STATUS_LABELS[proof.status] ?? proof.status,
        tone: PROOF_TONES[proof.status] ?? "neutro",
      },
      note: proof.status === "RECHAZADO" && proof.rejectionReason ? `Motivo: ${proof.rejectionReason}` : null,
    })),
    ...reserva.cashPayments.map((pago) => ({
      id: pago.id,
      at: pago.collectedAt,
      amount: formatMoney(pago.amount, pago.currency),
      description: "Pago en la taquilla",
      status: { label: "Recibido", tone: "exito" as PillTone },
      note: null,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/mi/reservas" className={buttonClass("fantasma", "-ml-3 self-start", "sm")}>
          <IconArrowLeft aria-hidden="true" className="size-5" />
          Mis viajes
        </Link>
        <h1 className="break-words text-2xl font-bold tracking-tight text-tinta sm:text-3xl">
          Viaje a {ruta.destination}
        </h1>
        <p className="leading-relaxed text-tinta-suave">
          {yaSalio ? `Salió el ${fechaHora(salida)}` : capitalize(`sale ${whenPhrase(salida, now)}`)} desde{" "}
          {ruta.origin}
        </p>
      </div>

      {recienCreada ? (
        <>
          <Alert tone="exito" title="¡Listo! Reservaste tu puesto">
            {reserva.status === "PAGO_EN_SITIO"
              ? `Paga ${saldoTexto} en la taquilla de ${agencia.name} antes del ${fechaHora(limiteTaquilla)}. Si no, el puesto se libera.`
              : reserva.status === "PENDIENTE_PAGO" && reserva.expiresAt
                ? `Ahora paga tu pasaje siguiendo los pasos de abajo. Tienes hasta ${whenPhrase(reserva.expiresAt, now)}.`
                : "Aquí verás tu ticket y lo que falta por pagar."}
          </Alert>
          <ClearFeedbackParams />
          <ClearBookingDraft />
        </>
      ) : null}

      <TicketCard data={ticketData} size="grande" qrDataUrl={qrDataUrl}>
        {reserva.ticket ? (
          <a
            href={`/api/archivos/${reserva.ticket.pdfPath}`}
            className={buttonClass("secundario", "w-full")}
          >
            <IconDownload aria-hidden="true" className="size-5" />
            Descargar el ticket en PDF
          </a>
        ) : reserva.status === "PAGADA" ? (
          <>
            <Alert tone="info" title="Estamos preparando tu ticket">
              Tu pago está confirmado. El código QR aparecerá aquí en unos minutos, sin que
              tengas que hacer nada.
            </Alert>
            <AutoRefresh />
          </>
        ) : null}
      </TicketCard>

      <AccionDePago
        estado={reserva.status}
        saldoTexto={saldoTexto}
        enRevisionTexto={enRevisionUsd.greaterThan(0) ? formatMoney(enRevisionUsd, "USD") : null}
        faltariaTexto={faltaria.greaterThan(0) ? formatMoney(faltaria, "USD") : null}
        expiresAt={reserva.expiresAt}
        limiteTaquilla={limiteTaquilla}
        agenciaNombre={agencia.name}
        now={now}
        puedeEnviarComprobante={puedeEnviarComprobante}
        payForm={
          <PayForm
            reservationId={reserva.id}
            paymentMethods={metodosDigitales}
            defaultMethodId={reserva.paymentMethodId}
            collapsedLabel={
              reserva.status === "EN_VALIDACION"
                ? "Enviar otro comprobante"
                : reserva.status === "PAGO_EN_SITIO"
                  ? "Prefiero pagar en línea"
                  : undefined
            }
          />
        }
      />

      <Card className="flex flex-col gap-4">
        <SectionTitle>Datos del viaje</SectionTitle>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Dato etiqueta="Salida" valor={fechaHora(salida)} />
          <Dato etiqueta="Punto de encuentro" valor={ruta.meetingPoint} />
          <Dato etiqueta="Agencia" valor={agencia.name} />
          <Dato etiqueta="Pasajeros" valor={pasajerosTexto(reserva.passengerCount)} />
        </dl>
      </Card>

      <section aria-labelledby="quienes-viajan" className="flex flex-col gap-3">
        <SectionTitle id="quienes-viajan">Quiénes viajan</SectionTitle>
        <ul className="flex flex-col gap-2">
          {reserva.passengers.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1"
            >
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-marca-50 text-marca-600"
              >
                <IconUser className="size-5" />
              </span>
              <span className="min-w-0 flex-1 break-words font-medium text-tinta">{p.fullName}</span>
              {p.isHolder ? <Pill tone="marca">Tú</Pill> : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="tus-pagos" className="flex flex-col gap-3">
        <SectionTitle id="tus-pagos">Tus pagos</SectionTitle>
        {movimientos.length === 0 ? (
          <p className="rounded-tarjeta border border-dashed border-borde bg-superficie p-4 text-tinta-suave">
            Todavía no has registrado pagos en esta reserva.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {movimientos.map((mov) => (
              <li
                key={mov.id}
                className="flex flex-col gap-1.5 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="tabular text-lg font-bold text-tinta">{mov.amount}</span>
                  <Pill tone={mov.status.tone}>{mov.status.label}</Pill>
                </div>
                <p className="break-words text-tinta">{mov.description}</p>
                <p className="tabular text-sm text-tinta-suave">{fechaHora(mov.at)}</p>
                {mov.note ? <p className="font-medium text-peligro">{mov.note}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * Métodos de pago en línea de la agencia con lo que falta pagar convertido a
 * su moneda. Si la moneda es la de la reserva se usa la tasa congelada al
 * reservar; si no, la tasa vigente. Un método sin tasa vigente no se ofrece,
 * porque el pago no se podría registrar.
 */
async function metodosConSaldo(
  agencyId: string,
  saldo: Prisma.Decimal,
  reserva: { currency: Currency; exchangeRateUsed: Prisma.Decimal },
): Promise<MetodoVM[]> {
  const metodos = (await listActivePaymentMethods(agencyId)).filter((m) => m.kind === "DIGITAL");
  const monedasSinTasa = [
    ...new Set(metodos.map((m) => m.currency).filter((c) => !esDolar(c) && c !== reserva.currency)),
  ];
  const tasas = new Map(
    await Promise.all(
      monedasSinTasa.map(async (moneda) => [moneda, await getCurrentExchangeRate(moneda)] as const),
    ),
  );

  const resultado: MetodoVM[] = [];
  for (const m of metodos) {
    const tasa = esDolar(m.currency)
      ? null
      : m.currency === reserva.currency
        ? reserva.exchangeRateUsed
        : (tasas.get(m.currency) ?? null);
    if (!esDolar(m.currency) && tasa === null) continue;
    const monto = tasa === null ? saldo : round2(saldo.mul(tasa));
    resultado.push({
      id: m.id,
      name: m.name,
      currency: m.currency,
      currencyName: currencyName(m.currency),
      details: m.details as unknown as MetodoVM["details"],
      balanceLabel: formatMoney(monto, m.currency),
      balanceInput: round2(monto).toFixed(2).replace(".", ","),
    });
  }
  return resultado;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-tinta-suave">{etiqueta}</dt>
      <dd className="tabular break-words font-semibold text-tinta">{valor}</dd>
    </div>
  );
}

interface AccionDePagoProps {
  estado: string;
  saldoTexto: string;
  /** Suma de los comprobantes en revisión, en dólares; `null` si no hay. */
  enRevisionTexto: string | null;
  /** Lo que faltaría aun aprobando lo que está en revisión; `null` si nada. */
  faltariaTexto: string | null;
  expiresAt: Date | null;
  limiteTaquilla: Date;
  agenciaNombre: string;
  now: Date;
  puedeEnviarComprobante: boolean;
  payForm: ReactNode;
}

/**
 * Lo que toca hacer con el pago según el estado: pagar en línea (con los
 * pasos y el formulario), esperar la revisión de un comprobante, pagar en la
 * taquilla antes del límite, o entender por qué la reserva ya no sirve.
 * El formulario va siempre en la misma posición para que su mensaje de
 * "Recibimos tu comprobante" no se pierda cuando la página se actualiza.
 */
function AccionDePago({
  estado,
  saldoTexto,
  enRevisionTexto,
  faltariaTexto,
  expiresAt,
  limiteTaquilla,
  agenciaNombre,
  now,
  puedeEnviarComprobante,
  payForm,
}: AccionDePagoProps) {
  if (estado === "LIBERADA" || estado === "CANCELADA" || estado === "NO_SHOW") {
    const texto =
      estado === "LIBERADA"
        ? "El puesto se liberó porque no se registró el pago a tiempo. Si todavía quieres viajar, haz una reserva nueva."
        : estado === "CANCELADA"
          ? "Esta reserva fue cancelada y ya no sirve para viajar. Si todavía quieres viajar, haz una reserva nueva."
          : "No abordaste este viaje. Si necesitas viajar, haz una reserva nueva.";
    return (
      <Alert
        tone="info"
        role="none"
        title="Esta reserva ya no sirve para viajar"
        action={
          <Link href="/mi/reservar" className={buttonClass("primario", undefined, "sm")}>
            Reservar otro viaje
          </Link>
        }
      >
        {texto}
      </Alert>
    );
  }

  if (!puedeEnviarComprobante) return null;

  if (estado === "PAGO_EN_SITIO") {
    return (
      <section aria-labelledby="accion-pago">
        <Card className="flex flex-col gap-4">
          <SectionTitle id="accion-pago">Paga en la taquilla</SectionTitle>
          <p className="tabular text-3xl font-bold text-tinta">{saldoTexto}</p>
          <ul className="flex flex-col gap-3">
            <li className="flex items-start gap-3">
              <IconMapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-marca-600" />
              <span className="leading-relaxed text-tinta">
                En la taquilla de <strong className="font-semibold">{agenciaNombre}</strong>, en el
                terminal. Cuando pagues, tu ticket aparecerá aquí.
              </span>
            </li>
          </ul>
          <Alert tone="alerta" role="none" title={`Paga antes del ${fechaHora(limiteTaquilla)}`}>
            Si no pagas antes de esa hora, el puesto se libera para otra persona.
          </Alert>
          {payForm}
        </Card>
      </section>
    );
  }

  const enRevision = estado === "EN_VALIDACION";

  return (
    <section aria-labelledby="accion-pago">
      <Card className="flex flex-col gap-4">
        <SectionTitle id="accion-pago">{enRevision ? "Tu pago está en revisión" : "Paga lo que falta"}</SectionTitle>
        <div>
          <p className="text-sm text-tinta-suave">{enRevision ? "Por confirmar" : "Te faltan"}</p>
          <p className="tabular text-3xl font-bold text-tinta">{saldoTexto}</p>
        </div>
        {enRevision ? (
          <p className="leading-relaxed text-tinta">
            {enRevisionTexto
              ? `Estamos revisando tu comprobante de ${enRevisionTexto}. `
              : "Estamos revisando el comprobante que enviaste. "}
            {faltariaTexto
              ? `Aunque lo aprobemos, te faltarían ${faltariaTexto}: puedes enviar otro comprobante por esa parte.`
              : "Si lo aprobamos, tu pasaje queda pagado y no hace falta que envíes otro. Te avisaremos."}
          </p>
        ) : (
          <>
            {estado === "PENDIENTE_PAGO" && expiresAt && expiresAt > now ? (
              <Alert tone="alerta" role="none" title={`Tienes hasta ${whenPhrase(expiresAt, now)} para pagar`}>
                Si no registras ningún pago antes de esa hora, el puesto se libera.
              </Alert>
            ) : null}
            <ol className="flex flex-col gap-2">
              {[
                "Paga desde tu banco o billetera con los datos de abajo.",
                "Guarda la captura o toma una foto del pago.",
                "Llena este formulario y envíalo. La agencia lo revisará.",
              ].map((paso, indice) => (
                <li key={paso} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="tabular grid size-7 shrink-0 place-items-center rounded-full bg-marca-600 text-sm font-bold text-white"
                  >
                    {indice + 1}
                  </span>
                  <span className="leading-relaxed text-tinta">
                    <span className="sr-only">Paso {indice + 1}: </span>
                    {paso}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
        {payForm}
      </Card>
    </section>
  );
}
