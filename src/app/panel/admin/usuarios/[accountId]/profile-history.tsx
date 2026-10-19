import Link from "next/link";
import type { ReactNode } from "react";
import { AgencyBadge } from "@/components/agency-badge";
import { IconCash, IconCheckCircle, IconClock, IconTicket, IconUsers, IconXCircle } from "@/components/icons";
import { EmptyState, MobileCard, StatusBadge, TableShell } from "@/components/panel-ui";
import { Pill } from "@/components/ui";
import { cx } from "@/components/ui-classes";
import { formatMoney } from "@/lib/decimal";
import { reservationStatusLabel, reservationStatusTone } from "@/lib/labels";
import { formatCaracasDate, formatCaracasTime24 } from "@/lib/time";
import type {
  PassengerProfile,
  ProfileCompanionTripRow,
  ProfilePaymentRow,
  ProfileTripRow,
} from "@/modules/reports";
import { countLabel } from "../../_shared/format";
import { ADMIN_TD_CLASS, ADMIN_TH_CLASS, MobileCardList, TimeCell } from "../../_shared/lists";
import {
  paidOfTotalText,
  paymentKindLabel,
  paymentStatusView,
  routeText,
  timeWithDay,
  type PaymentStatusIcon,
} from "./profile-format";
import { PROFILE_LINK_CLASS, ProfileSection } from "./profile-section";

/** Cabeceras de las tres tablas, compartidas con la silueta de carga. */
export const TRIP_COLUMNS = [
  "Salida",
  "Ruta",
  "Agencia",
  "Unidad y chofer",
  "Estado",
  "Pagado",
  "Reserva",
  "Abordó y llegó",
] as const;
export const COMPANION_COLUMNS = ["Salida", "Ruta", "Agencia", "Titular", "Estado", "Abordó"] as const;
export const PAYMENT_COLUMNS = ["Fecha", "Reserva", "Tipo", "Método", "Monto", "Equivalente en USD", "Estado"] as const;

const NO_DATA = <span className="text-tinta-tenue">—</span>;

function profileHref(accountId: string): string {
  return `/panel/admin/usuarios/${accountId}`;
}

/** Bloque de color de la agencia con su nombre al lado. */
function AgencyCell({ id, name }: { id: string; name: string }) {
  return (
    <span className="flex items-start gap-2">
      <AgencyBadge agencyId={id} name={name} size="sm" decorative />
      <span className="min-w-0 break-words">{name}</span>
    </span>
  );
}

function HolderLink({ accountId, name }: { accountId: string; name: string }) {
  return (
    <Link href={profileHref(accountId)} className={cx(PROFILE_LINK_CLASS, "break-words")}>
      {name}
      <span className="sr-only">: abrir su perfil</span>
    </Link>
  );
}

const STATUS_ICONS: Record<PaymentStatusIcon, ReactNode> = {
  check: <IconCheckCircle />,
  x: <IconXCircle />,
  clock: <IconClock />,
};

function PaymentStatus({ status }: { status: ProfilePaymentRow["status"] }) {
  const view = paymentStatusView(status);
  return (
    <Pill tone={view.tone} icon={STATUS_ICONS[view.icon]}>
      {view.label}
    </Pill>
  );
}

/** Código de reserva sin partirse. */
function Code({ children }: { children: ReactNode }) {
  return <span className="tabular whitespace-nowrap font-semibold">{children}</span>;
}

function TableCaption({ children }: { children: string }) {
  return <caption className="sr-only">{children}</caption>;
}

function HeaderRow({ columns }: { columns: readonly string[] }) {
  return (
    <thead>
      <tr className="border-b border-borde">
        {columns.map((column) => (
          <th key={column} scope="col" className={ADMIN_TH_CLASS}>
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// ---------------------------------------------------------------------------
// Historial de viajes
// ---------------------------------------------------------------------------

function TripRow({ trip }: { trip: ProfileTripRow }) {
  return (
    <tr className="border-b border-borde last:border-0">
      <td className={cx(ADMIN_TD_CLASS, "align-top")}>
        <TimeCell time={formatCaracasTime24(trip.departsAt)} date={formatCaracasDate(trip.departsAt)} />
      </td>
      <td className={cx(ADMIN_TD_CLASS, "align-top font-semibold")}>{routeText(trip.origin, trip.destination)}</td>
      <td className={cx(ADMIN_TD_CLASS, "align-top")}>
        <AgencyCell id={trip.agencyId} name={trip.agencyName} />
      </td>
      <td className={cx(ADMIN_TD_CLASS, "align-top")}>
        <span className="tabular block whitespace-nowrap font-semibold">{trip.vehiclePlate}</span>
        <span className="block break-words text-tinta-suave">{trip.driverName}</span>
      </td>
      <td className={cx(ADMIN_TD_CLASS, "align-top")}>
        <StatusBadge label={reservationStatusLabel(trip.status)} tone={reservationStatusTone(trip.status)} />
      </td>
      <td className={cx(ADMIN_TD_CLASS, "tabular align-top")}>{paidOfTotalText(trip.paidUsd, trip.totalUsd)}</td>
      <td className={cx(ADMIN_TD_CLASS, "align-top")}>
        <Code>{trip.code}</Code>
        <span className="block text-tinta-suave">{trip.ticketIssuedAt ? "Ticket emitido" : "Sin ticket"}</span>
      </td>
      <td className={cx(ADMIN_TD_CLASS, "tabular align-top")}>
        <span className="block whitespace-nowrap">
          <span className="text-tinta-suave">Abordó</span> {timeWithDay(trip.boardedAt, trip.departsAt)}
        </span>
        <span className="block whitespace-nowrap">
          <span className="text-tinta-suave">Llegó</span> {timeWithDay(trip.arrivedAt, trip.departsAt)}
        </span>
      </td>
    </tr>
  );
}

function TripCard({ trip }: { trip: ProfileTripRow }) {
  return (
    <MobileCard
      title={routeText(trip.origin, trip.destination)}
      subtitle={
        <span className="flex items-center gap-2">
          <AgencyBadge agencyId={trip.agencyId} name={trip.agencyName} size="sm" decorative />
          <span className="min-w-0 break-words">{trip.agencyName}</span>
        </span>
      }
      status={<StatusBadge label={reservationStatusLabel(trip.status)} tone={reservationStatusTone(trip.status)} />}
      details={[
        { label: "Salida", value: `${formatCaracasDate(trip.departsAt)} ${formatCaracasTime24(trip.departsAt)}` },
        { label: "Pagado", value: paidOfTotalText(trip.paidUsd, trip.totalUsd) },
        { label: "Unidad", value: <span className="break-words">{trip.vehiclePlate} · {trip.driverName}</span> },
        { label: "Reserva", value: `${trip.code}${trip.ticketIssuedAt ? " · ticket emitido" : ""}` },
        { label: "Abordó", value: timeWithDay(trip.boardedAt, trip.departsAt) },
        { label: "Llegó", value: timeWithDay(trip.arrivedAt, trip.departsAt) },
      ]}
    />
  );
}

export function ProfileTrips({ trips }: { trips: ProfileTripRow[] }) {
  return (
    <ProfileSection
      id="historial"
      title="Historial de viajes"
      aside={countLabel(trips.length, "reserva", "reservas")}
      description="Las reservas que hizo como titular, de la salida más reciente a la más antigua."
    >
      {trips.length === 0 ? (
        <EmptyState icon={<IconTicket />} title="Todavía no tiene reservas." />
      ) : (
        <TableShell
          cardsUntil="xl"
          mobile={
            <MobileCardList
              items={trips.map((trip) => (
                <TripCard key={trip.reservationId} trip={trip} />
              ))}
              label="Historial de viajes"
              moreNoun={["reserva", "reservas"]}
            />
          }
        >
          {/* Ocho columnas: un relleno horizontal menor deja que la tabla quepa
              sin desplazarse a partir de `xl`, incluso con la barra lateral. */}
          <table className="w-full text-left [&_td]:px-2 [&_th]:px-2">
            <TableCaption>Historial de viajes</TableCaption>
            <HeaderRow columns={TRIP_COLUMNS} />
            <tbody>
              {trips.map((trip) => (
                <TripRow key={trip.reservationId} trip={trip} />
              ))}
            </tbody>
          </table>
        </TableShell>
      )}
    </ProfileSection>
  );
}

// ---------------------------------------------------------------------------
// Viajes como acompañante
// ---------------------------------------------------------------------------

function CompanionRow({ trip }: { trip: ProfileCompanionTripRow }) {
  return (
    <tr className="border-b border-borde last:border-0">
      <td className={cx(ADMIN_TD_CLASS, "align-top")}>
        <TimeCell time={formatCaracasTime24(trip.departsAt)} date={formatCaracasDate(trip.departsAt)} />
      </td>
      <td className={cx(ADMIN_TD_CLASS, "align-top font-semibold")}>{routeText(trip.origin, trip.destination)}</td>
      <td className={cx(ADMIN_TD_CLASS, "align-top")}>
        <AgencyCell id={trip.agencyId} name={trip.agencyName} />
      </td>
      <td className={cx(ADMIN_TD_CLASS, "align-top")}>
        <HolderLink accountId={trip.holderAccountId} name={trip.holderName} />
        <span className="block text-tinta-suave">
          Reserva <Code>{trip.code}</Code>
        </span>
      </td>
      <td className={cx(ADMIN_TD_CLASS, "align-top")}>
        <StatusBadge label={reservationStatusLabel(trip.status)} tone={reservationStatusTone(trip.status)} />
      </td>
      <td className={cx(ADMIN_TD_CLASS, "tabular align-top")}>
        {trip.boardedAt ? timeWithDay(trip.boardedAt, trip.departsAt) : NO_DATA}
      </td>
    </tr>
  );
}

function CompanionCard({ trip }: { trip: ProfileCompanionTripRow }) {
  return (
    <MobileCard
      title={routeText(trip.origin, trip.destination)}
      subtitle={
        <span className="flex items-center gap-2">
          <AgencyBadge agencyId={trip.agencyId} name={trip.agencyName} size="sm" decorative />
          <span className="min-w-0 break-words">{trip.agencyName}</span>
        </span>
      }
      status={<StatusBadge label={reservationStatusLabel(trip.status)} tone={reservationStatusTone(trip.status)} />}
      details={[
        { label: "Salida", value: `${formatCaracasDate(trip.departsAt)} ${formatCaracasTime24(trip.departsAt)}` },
        { label: "Abordó", value: timeWithDay(trip.boardedAt, trip.departsAt) },
        { label: "Reserva", value: trip.code },
      ]}
      action={
        <Link href={profileHref(trip.holderAccountId)} className={cx(PROFILE_LINK_CLASS, "inline-flex min-h-11 items-center")}>
          Titular: {trip.holderName}
          <span className="sr-only">: abrir su perfil</span>
        </Link>
      }
    />
  );
}

export function ProfileCompanionTrips({ trips }: { trips: ProfileCompanionTripRow[] }) {
  return (
    <ProfileSection
      id="acompanante"
      title="Viajes como acompañante"
      aside={countLabel(trips.length, "viaje", "viajes")}
      description="Reservas de otra persona en las que figura por su cédula."
    >
      {trips.length === 0 ? (
        <EmptyState icon={<IconUsers />} title="No ha viajado como acompañante." />
      ) : (
        <TableShell
          mobile={
            <MobileCardList
              items={trips.map((trip) => (
                <CompanionCard key={trip.reservationId} trip={trip} />
              ))}
              label="Viajes como acompañante"
              moreNoun={["viaje", "viajes"]}
            />
          }
        >
          <table className="w-full text-left">
            <TableCaption>Viajes como acompañante</TableCaption>
            <HeaderRow columns={COMPANION_COLUMNS} />
            <tbody>
              {trips.map((trip) => (
                <CompanionRow key={trip.reservationId} trip={trip} />
              ))}
            </tbody>
          </table>
        </TableShell>
      )}
    </ProfileSection>
  );
}

// ---------------------------------------------------------------------------
// Pagos
// ---------------------------------------------------------------------------

function PaymentRow({ payment }: { payment: ProfilePaymentRow }) {
  return (
    <tr className="border-b border-borde last:border-0">
      <td className={cx(ADMIN_TD_CLASS, "align-top")}>
        <TimeCell time={formatCaracasTime24(payment.at)} date={formatCaracasDate(payment.at)} />
      </td>
      <td className={cx(ADMIN_TD_CLASS, "align-top")}>
        <Code>{payment.reservationCode}</Code>
      </td>
      <td className={cx(ADMIN_TD_CLASS, "align-top")}>{paymentKindLabel(payment.kind)}</td>
      <td className={cx(ADMIN_TD_CLASS, "align-top break-words")}>{payment.methodName ?? NO_DATA}</td>
      <td className={cx(ADMIN_TD_CLASS, "tabular align-top whitespace-nowrap font-semibold")}>
        {formatMoney(payment.amount, payment.currency)}
      </td>
      <td className={cx(ADMIN_TD_CLASS, "tabular align-top whitespace-nowrap")}>
        {formatMoney(payment.amountUsd, "USD")}
      </td>
      <td className={cx(ADMIN_TD_CLASS, "align-top")}>
        <PaymentStatus status={payment.status} />
      </td>
    </tr>
  );
}

function PaymentCard({ payment }: { payment: ProfilePaymentRow }) {
  return (
    <MobileCard
      title={<span className="tabular">{formatMoney(payment.amount, payment.currency)}</span>}
      subtitle={
        <span className="tabular">
          {formatCaracasDate(payment.at)} {formatCaracasTime24(payment.at)}
        </span>
      }
      status={<PaymentStatus status={payment.status} />}
      details={[
        { label: "Tipo", value: paymentKindLabel(payment.kind) },
        { label: "Método", value: <span className="break-words">{payment.methodName ?? "—"}</span> },
        { label: "Reserva", value: payment.reservationCode },
        // En dólares el monto y su equivalente son la misma cifra: no se repite.
        ...(payment.currency === "USD"
          ? []
          : [{ label: "Equivalente en USD", value: formatMoney(payment.amountUsd, "USD") }]),
      ]}
    />
  );
}

export function ProfilePayments({ payments }: { payments: PassengerProfile["payments"] }) {
  return (
    <ProfileSection
      id="pagos"
      title="Pagos"
      aside={countLabel(payments.length, "pago", "pagos")}
      description="Comprobantes enviados y cobros en efectivo, del más reciente al más antiguo."
    >
      {payments.length === 0 ? (
        <EmptyState icon={<IconCash />} title="Todavía no tiene pagos." />
      ) : (
        <TableShell
          cardsUntil="xl"
          mobile={
            <MobileCardList
              items={payments.map((payment) => (
                <PaymentCard key={payment.id} payment={payment} />
              ))}
              label="Pagos"
              moreNoun={["pago", "pagos"]}
            />
          }
        >
          <table className="w-full text-left">
            <TableCaption>Pagos</TableCaption>
            <HeaderRow columns={PAYMENT_COLUMNS} />
            <tbody>
              {payments.map((payment) => (
                <PaymentRow key={payment.id} payment={payment} />
              ))}
            </tbody>
          </table>
        </TableShell>
      )}
    </ProfileSection>
  );
}
