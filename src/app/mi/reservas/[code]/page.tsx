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
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/alert";
import { ClearFeedbackParams } from "@/components/clear-feedback-params";
import { buttonClass, Card, Pill, SectionTitle, type PillTone } from "@/components/ui";
import { TicketCard, type TicketCardData } from "@/components/ticket-card";
import { IconArrowLeft, IconCash, IconChevronRight, IconDownload, IconMapPin, IconUser } from "@/components/icons";
import {
  capitalize,
  cashCounterDeadline,
  currencyName,
  dayTimePhrase,
  deadlineBeforePhrase,
  deadlinePhrase,
  isInactiveReservation,
  PASSENGER_PROOF_STATUS_LABELS,
  paymentDeadline,
  ticketDeadline,
  whenPhrase,
  type PaymentDeadline,
} from "@/components/passenger-copy";
import { ClearBookingDraft } from "../../_components/clear-booking-draft";
import { AutoRefresh } from "./auto-refresh";
import PayForm, { type MetodoVM } from "./pay-form";

export const metadata: Metadata = {
  title: "Detalle del viaje",
};

/**
 * Estados en los que el módulo de pagos acepta un comprobante (`CAN_SUBMIT_PROOF`).
 * La pantalla además deja de ofrecer el formulario cuando la salida ya pasó:
 * pagar un viaje que ya salió no le sirve al pasajero. Esa regla es solo de
 * la interfaz; `submitProof` no la aplica (pendiente de decidir con el
 * operador si el servidor también debe rechazarlo).
 */
const ESTADOS_CON_COMPROBANTE = new Set(["PENDIENTE_PAGO", "ABONADA", "EN_VALIDACION", "PAGO_EN_SITIO"]);

const PROOF_TONES: Record<string, PillTone> = {
  APROBADO: "exito",
  PENDIENTE: "info",
  RECHAZADO: "peligro",
};

/** Moneda que se cotiza a la par del dólar. */
function esDolar(currency: Currency): boolean {
  return currency === "USD" || currency === "USDT";
}

/** Un monto que no se parte entre dos líneas ("$" en una y "26,00" en la otra). */
function sinCorte(texto: string): string {
  return texto.replace(/ /g, "\u00a0");
}

/** Las referencias cortas no se parten en el guion ("REF-" en una línea y "415654" en otra). */
const REFERENCIA_SIN_CORTE_MAX = 24;

interface MovimientoVM {
  id: string;
  at: Date;
  amount: string;
  description: ReactNode;
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
  // Misma ventana con la que el barrido libera el puesto y con la que avisa `notices` (`dueForRelease12h`).
  const limiteTaquilla = cashCounterDeadline(salida, now);
  // Hasta cuándo puede pagar: nunca después de que salga el bus.
  const datosPlazo = {
    status: reserva.status,
    departsAt: salida,
    expiresAt: reserva.expiresAt,
    reconfirmedAt: reserva.reconfirmedAt,
  };
  const plazo = paymentDeadline(datosPlazo, now);
  // El ticket dice el plazo cuando apura; entonces el aviso de abajo no lo repite.
  const plazoEnTicket = ticketDeadline(datosPlazo, now);

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
    deadline: plazoEnTicket,
  };

  const movimientos: MovimientoVM[] = [
    ...reserva.proofs.map((proof) => ({
      id: proof.id,
      at: proof.createdAt,
      amount: formatMoney(proof.amount, proof.currency),
      description: (
        <>
          Comprobante con {proof.paymentMethod.name}, referencia{" "}
          <span className={proof.reference.length <= REFERENCIA_SIN_CORTE_MAX ? "tabular whitespace-nowrap" : "tabular"}>
            {proof.reference}
          </span>
        </>
      ),
      status: {
        label: PASSENGER_PROOF_STATUS_LABELS[proof.status] ?? proof.status,
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

  const inactiva = isInactiveReservation(reserva.status);
  // La frase de pago del ticket se calla cuando debajo hay una tarjeta que ya lo explica.
  const ocultarFraseDePago = puedeEnviarComprobante || inactiva;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/mi/reservas" className={buttonClass("fantasma", "-ml-3 self-start", "sm")}>
          <IconArrowLeft aria-hidden="true" className="size-5" />
          Mis viajes
        </Link>
        {/*
          Título solo para lectores de pantalla: el ticket de abajo ya dice la
          ruta, el día y la hora en grande. Repetirlos empujaría hacia abajo
          el QR o lo que falta hacer con el pago.
        */}
        <h1 className="sr-only">
          Viaje a {ruta.destination}, {`${yaSalio ? "salió" : "sale"} ${whenPhrase(salida, now)}`} desde{" "}
          {ruta.origin}
        </h1>
      </div>

      {recienCreada ? (
        <>
          <Alert tone="exito" title="¡Listo! Reservaste tu puesto">
            {reserva.status === "PAGO_EN_SITIO"
              ? `Paga ${sinCorte(saldoTexto)} en la taquilla de ${agencia.name}. Tienes hasta ${whenPhrase(limiteTaquilla, now)}; si no, el puesto se libera.`
              : reserva.status === "PENDIENTE_PAGO" && plazo
                ? `Ahora paga tu pasaje siguiendo los pasos de abajo. Tienes hasta ${deadlinePhrase(plazo, now)}.`
                : "Aquí verás tu ticket y lo que falta por pagar."}
          </Alert>
          <ClearFeedbackParams />
          <ClearBookingDraft />
        </>
      ) : null}

      <TicketCard
        data={ticketData}
        size="grande"
        qrDataUrl={qrDataUrl}
        hidePaymentPhrase={ocultarFraseDePago}
        reviewUsd={enRevisionUsd.toString()}
        now={now}
      >
        {!inactiva && !yaSalio ? (
          <div className="flex items-start gap-3 rounded-control border border-marca-200 bg-marca-50 px-4 py-3">
            <IconMapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-marca-600" />
            <div className="min-w-0">
              <p className="text-sm text-tinta-suave">Dónde abordar</p>
              <p className="break-words font-semibold text-tinta">{ruta.meetingPoint}</p>
            </div>
          </div>
        ) : null}
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
        plazo={plazo}
        plazoEnTicket={plazoEnTicket !== null}
        hayPagoEnLinea={metodosDigitales.length > 0}
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
                ? faltaria.greaterThan(0)
                  ? `Enviar un comprobante por ${formatMoney(faltaria, "USD")}`
                  : "Enviar otro comprobante"
                : reserva.status === "PAGO_EN_SITIO"
                  ? "Prefiero pagar en línea"
                  : undefined
            }
            collapsedVariant={
              reserva.status === "EN_VALIDACION" && !faltaria.greaterThan(0) ? "fantasma" : "secundario"
            }
          />
        }
      />

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
              {p.isHolder ? <span className="shrink-0 text-sm text-tinta-suave">Tú</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="tus-pagos" className="flex flex-col gap-3">
        <SectionTitle id="tus-pagos">Tus pagos</SectionTitle>
        {movimientos.length === 0 ? (
          // Estado vacío del pasajero (spec, principio 7): icono, qué significa y la salida.
          // La acción de pagar está arriba, en "Paga lo que falta": el enlace sube a ella.
          <div className="flex items-start gap-3 rounded-tarjeta border border-dashed border-borde bg-superficie p-4">
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-50 text-marca-600"
            >
              <IconCash className="size-5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="font-semibold text-tinta">
                {inactiva ? "No registraste pagos en esta reserva" : "Todavía no hay pagos en esta reserva"}
              </p>
              {puedeEnviarComprobante ? (
                <>
                  <p className="text-pretty text-sm leading-relaxed text-tinta-suave">
                    Cuando pagues, tu pago aparecerá aquí con su estado.
                  </p>
                  <a href="#accion-pago" className="foco -ml-1 inline-flex min-h-11 items-center gap-1 self-start rounded-control px-1 font-semibold text-marca-700 hover:underline">
                    Ver cómo pagar
                    <IconChevronRight aria-hidden="true" className="size-4 shrink-0" />
                  </a>
                </>
              ) : null}
            </div>
          </div>
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
                <p className="tabular text-sm text-tinta-suave">{capitalize(dayTimePhrase(mov.at, now))}</p>
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
      equivalentUsd: tasa === null ? null : formatMoney(saldo, "USD"),
    });
  }
  return resultado;
}

interface AccionDePagoProps {
  estado: string;
  saldoTexto: string;
  /** Suma de los comprobantes en revisión, en dólares; `null` si no hay. */
  enRevisionTexto: string | null;
  /** Lo que faltaría aun aprobando lo que está en revisión; `null` si nada. */
  faltariaTexto: string | null;
  /** Hasta cuándo puede pagar sin perder el puesto; `null` si no corre ningún plazo. */
  plazo: PaymentDeadline | null;
  /** El ticket de arriba ya dice el plazo en su línea de alerta. */
  plazoEnTicket: boolean;
  /** La agencia tiene pagos en línea: la cifra a pagar va en el recuadro del método. */
  hayPagoEnLinea: boolean;
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
  plazo,
  plazoEnTicket,
  hayPagoEnLinea,
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
          {plazoEnTicket && plazo ? (
            <Alert tone="alerta" role="none">
              Si no pagas {deadlineBeforePhrase(plazo, now)}, el puesto se libera para otra persona.
            </Alert>
          ) : (
            <Alert tone="alerta" role="none" title={`Tienes hasta ${whenPhrase(limiteTaquilla, now)} para pagar`}>
              Si no pagas antes de esa hora, el puesto se libera para otra persona.
            </Alert>
          )}
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
        {/*
          Una sola cifra grande por pantalla para lo mismo: con pagos en línea, el
          monto va en el recuadro del método, en la moneda con que se paga (el
          ticket ya dice el saldo en dólares). En revisión, la cifra es lo enviado;
          lo que faltaría lo dice la frase de abajo.
        */}
        {enRevision || !hayPagoEnLinea ? (
          <div>
            <p className="text-sm text-tinta-suave">{enRevision ? "Por confirmar" : "Te faltan"}</p>
            <p className="tabular text-3xl font-bold text-tinta">
              {enRevision ? (enRevisionTexto ?? saldoTexto) : saldoTexto}
            </p>
          </div>
        ) : null}
        {enRevision ? (
          <p className="leading-relaxed text-tinta">
            {faltariaTexto
              ? `Aunque aprobemos ${enRevisionTexto ? `el comprobante de ${sinCorte(enRevisionTexto)}` : "tu comprobante"}, te faltarían ${sinCorte(faltariaTexto)}. Puedes enviar otro por esa parte.`
              : "Si lo aprobamos, tu pasaje queda pagado. Te avisaremos."}
          </p>
        ) : (
          <>
            {estado === "PENDIENTE_PAGO" && plazo ? (
              plazo.boundByDeparture ? (
                // El bus sale antes de que venza la reserva: el riesgo es perder el bus.
                <Alert tone="alerta" role="none" title="Tu bus sale pronto">
                  Paga y envía el comprobante cuanto antes, y llega al terminal con tiempo.
                </Alert>
              ) : (
                <Alert tone="alerta" role="none">
                  Si no registras ningún pago {deadlineBeforePhrase(plazo, now)}, el puesto se libera para
                  otra persona.
                </Alert>
              )
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
