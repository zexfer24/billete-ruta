import { Prisma } from "@prisma/client";
import type {
  Currency,
  DocumentType,
  ProofStatus,
  ReservationStatus,
  SalesChannel,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { round2, ZERO } from "@/lib/decimal";
import { ageFromBirthYear, normalizeIdNumber } from "@/lib/identity";
import { writeAudit } from "@/modules/audit";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ProfileDocument {
  id: string;
  type: DocumentType;
  filePath: string;
  originalName: string;
  uploadedAt: Date;
  verifiedAt: Date | null;
}

export interface ProfileDocumentGroup {
  current: ProfileDocument | null;
  previous: ProfileDocument[];
}

export interface ProfileTripRow {
  reservationId: string;
  code: string;
  createdAt: Date;
  departsAt: Date;
  origin: string;
  destination: string;
  agencyId: string;
  agencyName: string;
  vehiclePlate: string;
  driverName: string;
  status: ReservationStatus;
  salesChannel: SalesChannel;
  passengerCount: number;
  totalUsd: Prisma.Decimal;
  paidUsd: Prisma.Decimal;
  ticketIssuedAt: Date | null;
  /** Abordaje del titular (su fila Passenger con isHolder). */
  boardedAt: Date | null;
  departedAt: Date | null;
  arrivedAt: Date | null;
}

export interface ProfileCompanionTripRow {
  reservationId: string;
  code: string;
  holderAccountId: string;
  holderName: string;
  departsAt: Date;
  origin: string;
  destination: string;
  agencyId: string;
  agencyName: string;
  status: ReservationStatus;
  boardedAt: Date | null;
  arrivedAt: Date | null;
}

export interface ProfilePaymentRow {
  id: string;
  kind: "COMPROBANTE" | "EFECTIVO";
  at: Date;
  reservationCode: string;
  methodName: string | null;
  amount: Prisma.Decimal;
  currency: Currency;
  amountUsd: Prisma.Decimal;
  /** Estado del comprobante; el efectivo siempre es "COBRADO". */
  status: ProofStatus | "COBRADO";
}

export interface SummaryTripInput {
  role: "TITULAR" | "ACOMPANANTE";
  status: ReservationStatus;
  ticketIssued: boolean;
  /** La persona abordó (su fila Passenger tiene boardedAt). */
  traveled: boolean;
  /** ZERO para el acompañante. */
  paidUsd: Prisma.Decimal;
  origin: string;
  destination: string;
  agencyId: string;
  agencyName: string;
}

export interface TravelSummary {
  paidTickets: number;
  completedTrips: number;
  totalReservations: number;
  releasedOrCancelled: number;
  noShows: number;
  totalPaidUsd: Prisma.Decimal;
  distinctDestinations: number;
  distinctOrigins: number;
  distinctAgencies: number;
  topDestinations: Array<{ name: string; count: number }>;
  topAgencies: Array<{ id: string; name: string; count: number }>;
}

export interface PassengerProfile {
  account: {
    id: string;
    idNumber: string;
    givenNames: string;
    surnames: string;
    fullName: string;
    phone: string;
    birthYear: number;
    age: number;
    createdAt: Date;
    lastLoginAt: Date | null;
    active: boolean;
    /** La cuenta tiene contraseña; nunca se expone el hash. */
    activated: boolean;
    createdVia: "APP" | "TAQUILLA";
    createdByName: string | null;
  };
  documents: {
    profilePhoto: ProfileDocumentGroup;
    cedula: ProfileDocumentGroup;
    travelPermits: ProfileDocument[];
  };
  summary: TravelSummary;
  /** Reservas como titular, salida más reciente primero. */
  trips: ProfileTripRow[];
  /** Viajes como acompañante en reservas ajenas, salida más reciente primero. */
  companionTrips: ProfileCompanionTripRow[];
  /** Comprobantes y cobros en efectivo, el más reciente primero. */
  payments: ProfilePaymentRow[];
}

export type TravelRole = "TITULAR" | "ACOMPANANTE" | "CHOFER";

export interface TravelHistoryRow {
  role: TravelRole;
  reservationId: string | null;
  code: string | null;
  departureId: string;
  departsAt: Date;
  origin: string;
  destination: string;
  agencyId: string;
  agencyName: string;
  vehiclePlate: string;
  /** Estado de la reserva; para CHOFER, el de la salida. */
  status: string;
  boardedAt: Date | null;
  departedAt: Date | null;
  arrivedAt: Date | null;
}

// ---------------------------------------------------------------------------
// Resumen de viajes (puro)
// ---------------------------------------------------------------------------

const TOP_LIMIT = 5;

function countBy<K extends string>(keys: K[]): Map<K, number> {
  const conteo = new Map<K, number>();
  for (const key of keys) conteo.set(key, (conteo.get(key) ?? 0) + 1);
  return conteo;
}

/**
 * Resume el historial de una persona. Una fila cuenta como viaje si la persona
 * abordó, o si es titular con ticket emitido (pagó y tiene el pasaje en mano).
 */
export function summarizeTravel(trips: SummaryTripInput[]): TravelSummary {
  const titulares = trips.filter((t) => t.role === "TITULAR");
  const viajes = trips.filter((t) => t.traveled || (t.role === "TITULAR" && t.ticketIssued));

  const destinos = countBy(viajes.map((t) => t.destination));
  const origenes = new Set(viajes.map((t) => t.origin));

  const agencias = new Map<string, { name: string; count: number }>();
  for (const viaje of viajes) {
    const previa = agencias.get(viaje.agencyId);
    agencias.set(viaje.agencyId, {
      name: viaje.agencyName,
      count: (previa?.count ?? 0) + 1,
    });
  }

  const topDestinations = Array.from(destinos, ([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"))
    .slice(0, TOP_LIMIT);
  const topAgencies = Array.from(agencias, ([id, v]) => ({ id, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"))
    .slice(0, TOP_LIMIT);

  return {
    paidTickets: titulares.filter((t) => t.ticketIssued).length,
    completedTrips: trips.filter((t) => t.traveled).length,
    totalReservations: titulares.length,
    releasedOrCancelled: titulares.filter(
      (t) => t.status === "LIBERADA" || t.status === "CANCELADA",
    ).length,
    noShows: titulares.filter((t) => t.status === "NO_SHOW").length,
    totalPaidUsd: titulares.reduce((acc, t) => round2(acc.add(t.paidUsd)), ZERO),
    distinctDestinations: destinos.size,
    distinctOrigins: origenes.size,
    distinctAgencies: agencias.size,
    topDestinations,
    topAgencies,
  };
}

// ---------------------------------------------------------------------------
// Perfil del pasajero
// ---------------------------------------------------------------------------

function toProfileDocument(doc: {
  id: string;
  type: DocumentType;
  filePath: string;
  originalName: string;
  uploadedAt: Date;
  verifiedAt: Date | null;
}): ProfileDocument {
  return {
    id: doc.id,
    type: doc.type,
    filePath: doc.filePath,
    originalName: doc.originalName,
    uploadedAt: doc.uploadedAt,
    verifiedAt: doc.verifiedAt,
  };
}

/** Documentos de un tipo, el más reciente como vigente y el resto como anteriores. */
function groupDocuments(docs: ProfileDocument[]): ProfileDocumentGroup {
  return { current: docs[0] ?? null, previous: docs.slice(1) };
}

/**
 * Perfil interno de un pasajero, para el admin. Devuelve `null` si la cuenta no
 * existe. Cada consulta exitosa queda auditada: expone identidad, documentos y
 * pagos de una persona concreta.
 */
export async function getPassengerProfile(
  accountId: string,
  panelUserId: string,
): Promise<PassengerProfile | null> {
  const cuenta = await prisma.passengerAccount.findUnique({
    where: { id: accountId },
    include: { documents: { orderBy: [{ uploadedAt: "desc" }, { id: "desc" }] } },
  });
  if (!cuenta) return null;

  const [reservas, acompanantes, creador] = await Promise.all([
    prisma.reservation.findMany({
      where: { accountId },
      include: {
        ticket: { select: { issuedAt: true } },
        passengers: { select: { isHolder: true, boardedAt: true } },
        proofs: { include: { paymentMethod: { select: { name: true } } } },
        cashPayments: true,
        paymentMethod: { select: { name: true } },
        departure: {
          include: {
            route: { include: { agency: { select: { id: true, name: true } } } },
            vehicle: { select: { plate: true } },
            driver: { select: { fullName: true } },
            tripLog: { select: { departedAt: true, arrivedAt: true } },
          },
        },
      },
      orderBy: [{ departure: { departsAt: "desc" } }, { id: "desc" }],
    }),
    prisma.passenger.findMany({
      where: {
        idNumber: cuenta.idNumber,
        isHolder: false,
        reservation: { accountId: { not: accountId } },
      },
      include: {
        reservation: {
          include: {
            account: { select: { id: true, fullName: true } },
            departure: {
              include: {
                route: { include: { agency: { select: { id: true, name: true } } } },
                tripLog: { select: { arrivedAt: true } },
              },
            },
          },
        },
      },
      orderBy: [{ reservation: { departure: { departsAt: "desc" } } }, { id: "desc" }],
    }),
    cuenta.createdByPanelUserId
      ? prisma.panelUser.findUnique({
          where: { id: cuenta.createdByPanelUserId },
          select: { name: true },
        })
      : Promise.resolve(null),
  ]);

  const documentos = cuenta.documents.map(toProfileDocument);
  const deTipo = (tipo: DocumentType) => documentos.filter((d) => d.type === tipo);

  const trips: ProfileTripRow[] = reservas.map((r) => {
    const titular = r.passengers.find((p) => p.isHolder);
    const ruta = r.departure.route;
    return {
      reservationId: r.id,
      code: r.code,
      createdAt: r.createdAt,
      departsAt: r.departure.departsAt,
      origin: ruta.origin,
      destination: ruta.destination,
      agencyId: ruta.agency.id,
      agencyName: ruta.agency.name,
      vehiclePlate: r.departure.vehicle.plate,
      driverName: r.departure.driver.fullName,
      status: r.status,
      salesChannel: r.salesChannel,
      passengerCount: r.passengerCount,
      totalUsd: r.totalUsd,
      paidUsd: r.paidUsd,
      ticketIssuedAt: r.ticket?.issuedAt ?? null,
      boardedAt: titular?.boardedAt ?? null,
      departedAt: r.departure.tripLog?.departedAt ?? null,
      arrivedAt: r.departure.tripLog?.arrivedAt ?? null,
    };
  });

  const companionTrips: ProfileCompanionTripRow[] = acompanantes.map((p) => {
    const ruta = p.reservation.departure.route;
    return {
      reservationId: p.reservation.id,
      code: p.reservation.code,
      holderAccountId: p.reservation.account.id,
      holderName: p.reservation.account.fullName,
      departsAt: p.reservation.departure.departsAt,
      origin: ruta.origin,
      destination: ruta.destination,
      agencyId: ruta.agency.id,
      agencyName: ruta.agency.name,
      status: p.reservation.status,
      boardedAt: p.boardedAt,
      arrivedAt: p.reservation.departure.tripLog?.arrivedAt ?? null,
    };
  });

  const payments: ProfilePaymentRow[] = reservas
    .flatMap((r) => [
      ...r.proofs.map(
        (proof): ProfilePaymentRow => ({
          id: proof.id,
          kind: "COMPROBANTE",
          at: proof.createdAt,
          reservationCode: r.code,
          methodName: proof.paymentMethod.name,
          amount: proof.amount,
          currency: proof.currency,
          amountUsd: proof.amountUsd,
          status: proof.status,
        }),
      ),
      ...r.cashPayments.map(
        (cash): ProfilePaymentRow => ({
          id: cash.id,
          kind: "EFECTIVO",
          at: cash.collectedAt,
          reservationCode: r.code,
          methodName: r.paymentMethod.name,
          amount: cash.amount,
          currency: cash.currency,
          amountUsd: cash.amountUsd,
          status: "COBRADO",
        }),
      ),
    ])
    .sort((a, b) => b.at.getTime() - a.at.getTime());

  const summary = summarizeTravel([
    ...trips.map(
      (t): SummaryTripInput => ({
        role: "TITULAR",
        status: t.status,
        ticketIssued: t.ticketIssuedAt !== null,
        traveled: t.boardedAt !== null,
        paidUsd: t.paidUsd,
        origin: t.origin,
        destination: t.destination,
        agencyId: t.agencyId,
        agencyName: t.agencyName,
      }),
    ),
    ...companionTrips.map(
      (c): SummaryTripInput => ({
        role: "ACOMPANANTE",
        status: c.status,
        ticketIssued: false,
        traveled: c.boardedAt !== null,
        paidUsd: ZERO,
        origin: c.origin,
        destination: c.destination,
        agencyId: c.agencyId,
        agencyName: c.agencyName,
      }),
    ),
  ]);

  await prisma.$transaction(async (tx) => {
    await writeAudit(tx, {
      actorType: "PANEL",
      actorPanelUserId: panelUserId,
      entityType: "PassengerAccount",
      entityId: accountId,
      action: "CONSULTA_PERFIL_PASAJERO",
      after: { reservas: trips.length },
    });
  });

  return {
    account: {
      id: cuenta.id,
      idNumber: cuenta.idNumber,
      givenNames: cuenta.givenNames,
      surnames: cuenta.surnames,
      fullName: cuenta.fullName,
      phone: cuenta.phone,
      birthYear: cuenta.birthYear,
      age: ageFromBirthYear(cuenta.birthYear),
      createdAt: cuenta.createdAt,
      lastLoginAt: cuenta.lastLoginAt,
      active: cuenta.active,
      activated: cuenta.passwordHash !== null,
      createdVia: cuenta.createdByPanelUserId ? "TAQUILLA" : "APP",
      createdByName: creador?.name ?? null,
    },
    documents: {
      profilePhoto: groupDocuments(deTipo("FOTO_PERFIL")),
      cedula: groupDocuments(deTipo("CEDULA")),
      travelPermits: deTipo("PERMISO_VIAJE"),
    },
    summary,
    trips,
    companionTrips,
    payments,
  };
}

// ---------------------------------------------------------------------------
// Historial por cédula
// ---------------------------------------------------------------------------

const DEFAULT_HISTORY_LIMIT = 200;

/**
 * Historial de viajes de una cédula como titular, acompañante o chofer, la
 * salida más reciente primero. No audita: quien la llame audita su propia vista.
 */
export async function listTravelHistoryByIdNumber(
  idNumber: string,
  options: { limit?: number } = {},
): Promise<TravelHistoryRow[]> {
  const cedula = normalizeIdNumber(idNumber);
  const limit = Math.max(1, options.limit ?? DEFAULT_HISTORY_LIMIT);

  const departureInclude = {
    route: { include: { agency: { select: { id: true, name: true } } } },
    vehicle: { select: { plate: true } },
    tripLog: { select: { departedAt: true, arrivedAt: true } },
  } satisfies Prisma.DepartureInclude;

  const [titulares, acompanantes, salidas] = await Promise.all([
    prisma.reservation.findMany({
      where: { account: { idNumber: cedula } },
      include: {
        passengers: { where: { isHolder: true }, select: { boardedAt: true } },
        departure: { include: departureInclude },
      },
      orderBy: [{ departure: { departsAt: "desc" } }, { id: "desc" }],
      take: limit,
    }),
    prisma.passenger.findMany({
      where: { idNumber: cedula, isHolder: false },
      include: {
        reservation: { include: { departure: { include: departureInclude } } },
      },
      orderBy: [{ reservation: { departure: { departsAt: "desc" } } }, { id: "desc" }],
      take: limit,
    }),
    prisma.departure.findMany({
      where: { driver: { idNumber: cedula } },
      include: departureInclude,
      orderBy: [{ departsAt: "desc" }, { id: "desc" }],
      take: limit,
    }),
  ]);

  const filas: TravelHistoryRow[] = [
    ...titulares.map(
      (r): TravelHistoryRow => ({
        role: "TITULAR",
        reservationId: r.id,
        code: r.code,
        departureId: r.departureId,
        departsAt: r.departure.departsAt,
        origin: r.departure.route.origin,
        destination: r.departure.route.destination,
        agencyId: r.departure.route.agency.id,
        agencyName: r.departure.route.agency.name,
        vehiclePlate: r.departure.vehicle.plate,
        status: r.status,
        boardedAt: r.passengers[0]?.boardedAt ?? null,
        departedAt: r.departure.tripLog?.departedAt ?? null,
        arrivedAt: r.departure.tripLog?.arrivedAt ?? null,
      }),
    ),
    ...acompanantes.map(
      (p): TravelHistoryRow => ({
        role: "ACOMPANANTE",
        reservationId: p.reservation.id,
        code: p.reservation.code,
        departureId: p.reservation.departureId,
        departsAt: p.reservation.departure.departsAt,
        origin: p.reservation.departure.route.origin,
        destination: p.reservation.departure.route.destination,
        agencyId: p.reservation.departure.route.agency.id,
        agencyName: p.reservation.departure.route.agency.name,
        vehiclePlate: p.reservation.departure.vehicle.plate,
        status: p.reservation.status,
        boardedAt: p.boardedAt,
        departedAt: p.reservation.departure.tripLog?.departedAt ?? null,
        arrivedAt: p.reservation.departure.tripLog?.arrivedAt ?? null,
      }),
    ),
    ...salidas.map(
      (d): TravelHistoryRow => ({
        role: "CHOFER",
        reservationId: null,
        code: null,
        departureId: d.id,
        departsAt: d.departsAt,
        origin: d.route.origin,
        destination: d.route.destination,
        agencyId: d.route.agency.id,
        agencyName: d.route.agency.name,
        vehiclePlate: d.vehicle.plate,
        status: d.status,
        boardedAt: null,
        departedAt: d.tripLog?.departedAt ?? null,
        arrivedAt: d.tripLog?.arrivedAt ?? null,
      }),
    ),
  ];

  return filas.sort((a, b) => b.departsAt.getTime() - a.departsAt.getTime()).slice(0, limit);
}
