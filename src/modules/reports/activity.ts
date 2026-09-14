import type { ActorType, Currency, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMoney, toDecimal } from "@/lib/decimal";
import { reservationStatusLabel, type StatusTone } from "@/lib/labels";
import { formatCaracas } from "@/lib/time";

/**
 * Una entrada de auditoría ya resuelta: con el nombre del actor y el "sujeto"
 * (serial de reserva, salida, placa o chofer) listos para describirse. Es la
 * entrada de `describeActivity`, una función pura sin acceso a base de datos.
 */
export interface ActivityEntry {
  id: string;
  at: Date;
  actorType: ActorType;
  actorName: string | null;
  action: string;
  entityType: string;
  subject: string | null;
  after: Record<string, unknown>;
}

export interface ActivityRow {
  id: string;
  at: Date;
  text: string;
  tone: StatusTone;
}

const CURRENCIES: readonly Currency[] = ["USD", "VES", "COP", "USDT"];

/** Formatea `after.amount`/`after.currency` cuando ambos son valores válidos; si no, devuelve `null`. */
function formatAfterAmount(after: Record<string, unknown>): string | null {
  const { amount, currency } = after;
  if (typeof amount !== "string" || typeof currency !== "string") return null;
  if (!(CURRENCIES as readonly string[]).includes(currency)) return null;
  try {
    return formatMoney(toDecimal(amount), currency as Currency);
  } catch {
    return null;
  }
}

function actorLabel(entry: ActivityEntry): string {
  switch (entry.actorType) {
    case "PANEL":
      return entry.actorName ?? "Un operador";
    case "PASAJERO":
      return "El pasajero";
    case "SISTEMA":
      return "El sistema";
  }
}

/**
 * Traduce una entrada de auditoría a una frase legible por el operador, con
 * su tono de pastilla. Nunca lee ni imprime `after.idNumber`, cédulas ni
 * teléfonos: la bitácora de actividad es una vista pública dentro del panel
 * y no debe filtrar datos sensibles del pasajero.
 */
export function describeActivity(entry: ActivityEntry): { text: string; tone: StatusTone } {
  const actor = actorLabel(entry);
  const sujeto = entry.subject ?? "una reserva";

  switch (entry.action) {
    case "RESERVA_CREADA":
      return entry.actorType === "PANEL"
        ? { text: `${actor} vendió en taquilla la reserva ${sujeto}`, tone: "marca" }
        : { text: `El pasajero creó la reserva ${sujeto}`, tone: "marca" };
    case "COMPROBANTE_CARGADO":
      return { text: `El pasajero cargó un comprobante en ${sujeto}`, tone: "marca" };
    case "PAGO_APROBADO":
      return { text: `${actor} aprobó un pago de ${sujeto}`, tone: "exito" };
    case "PAGO_RECHAZADO":
      return { text: `${actor} rechazó un comprobante de ${sujeto}`, tone: "peligro" };
    case "PAGO_EN_EXCESO":
      return { text: `Se registró un pago en exceso en ${sujeto}`, tone: "alerta" };
    case "COBRO_EN_SITIO": {
      const importe = formatAfterAmount(entry.after);
      const texto = importe
        ? `${actor} cobró en efectivo ${importe} en ${sujeto}`
        : `${actor} cobró en efectivo en ${sujeto}`;
      return { text: texto, tone: "exito" };
    }
    case "ABORDAJE_REGISTRADO":
      return { text: `${actor} registró el abordaje de ${sujeto}`, tone: "exito" };
    case "ESTADO_PAGADA":
      return { text: `${sujeto} quedó pagada y se emitió el ticket`, tone: "exito" };
    case "ESTADO_LIBERADA":
      return { text: `${actor} liberó la reserva ${sujeto}`, tone: "neutro" };
    case "ESTADO_CANCELADA":
      return { text: `${actor} canceló la reserva ${sujeto}`, tone: "neutro" };
    case "ESTADO_NO_SHOW":
      return { text: `${sujeto} quedó como ausente`, tone: "neutro" };
    case "SALIDA_CREADA":
      return {
        text: entry.subject ? `${actor} creó la salida ${entry.subject}` : `${actor} creó una salida`,
        tone: "marca",
      };
    case "EMBARQUE_INICIADO":
      return { text: `${actor} inició el embarque de ${entry.subject ?? "una salida"}`, tone: "alerta" };
    case "SALIDA_REGISTRADA":
      return {
        text: `${actor} registró la partida de ${entry.subject ?? "una salida"}`,
        tone: "exito",
      };
    case "LLEGADA_REGISTRADA":
      return {
        text: `${actor} registró la llegada de ${entry.subject ?? "una salida"}`,
        tone: "exito",
      };
    case "VEHICULO_CREADO":
      return { text: `${actor} registró el vehículo ${entry.subject}`, tone: "neutro" };
    case "VEHICULO_ACTUALIZADO":
      return { text: `${actor} actualizó el vehículo ${entry.subject}`, tone: "neutro" };
    case "CHOFER_CREADO":
      return { text: `${actor} registró al chofer ${entry.subject}`, tone: "neutro" };
    case "CHOFER_ACTUALIZADO":
      return { text: `${actor} actualizó al chofer ${entry.subject}`, tone: "neutro" };
    case "CUENTA_CREADA_EN_TAQUILLA":
      return { text: `${actor} registró un pasajero en taquilla`, tone: "neutro" };
    case "CUENTA_ACTIVADA":
      return { text: "El pasajero activó su cuenta", tone: "neutro" };
    default: {
      if (entry.action.startsWith("ESTADO_")) {
        const estado = entry.action.slice("ESTADO_".length);
        return { text: `${sujeto} pasó a ${reservationStatusLabel(estado)}`, tone: "neutro" };
      }
      return {
        text: `${actor} registró un cambio en ${entry.subject ?? "el sistema"}`,
        tone: "neutro",
      };
    }
  }
}

/**
 * Actividad reciente de la agencia, para el bloque "Actividad reciente" del
 * tablero: reúne la bitácora de sus usuarios, sus reservas, los comprobantes
 * de esas reservas y sus salidas, vehículos y choferes, y la traduce a texto
 * con `describeActivity`.
 */
export async function listAgencyActivity(
  agencyId: string,
  filter: { from: Date; to: Date; limit?: number },
): Promise<{ rows: ActivityRow[]; truncated: boolean }> {
  const limit = Math.min(100, Math.max(1, filter.limit ?? 20));

  const usuarios = await prisma.panelUser.findMany({
    where: { agencyId },
    select: { id: true, name: true },
  });
  const nombrePorUsuario = new Map(usuarios.map((u) => [u.id, u.name]));
  const idsUsuarios = usuarios.map((u) => u.id);

  const reservasConActividad = await prisma.reservation.findMany({
    where: { departure: { route: { agencyId } }, updatedAt: { gte: filter.from } },
    select: { id: true, code: true },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });
  const truncated = reservasConActividad.length === 500;
  const idsReservas = reservasConActividad.map((r) => r.id);
  const codigoPorReserva = new Map(reservasConActividad.map((r) => [r.id, r.code]));

  const comprobantes =
    idsReservas.length > 0
      ? await prisma.paymentProof.findMany({
          where: { reservationId: { in: idsReservas } },
          select: { id: true, reservationId: true },
        })
      : [];
  const idsComprobantes = comprobantes.map((c) => c.id);
  const reservaPorComprobante = new Map(comprobantes.map((c) => [c.id, c.reservationId]));

  const or: Prisma.AuditLogWhereInput[] = [];
  if (idsUsuarios.length > 0) or.push({ actorPanelUserId: { in: idsUsuarios } });
  if (idsReservas.length > 0) or.push({ entityType: "Reservation", entityId: { in: idsReservas } });
  if (idsComprobantes.length > 0) {
    or.push({ entityType: "PaymentProof", entityId: { in: idsComprobantes } });
  }

  if (or.length === 0) return { rows: [], truncated };

  const registros = await prisma.auditLog.findMany({
    where: {
      createdAt: { gte: filter.from, lte: filter.to },
      NOT: [{ action: { startsWith: "CONSULTA_" } }, { action: "DOCUMENTO_CONSULTADO" }],
      OR: or,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Sujetos que faltan por resolver, siempre filtrando por la agencia para no
  // filtrar datos de otra.
  const idsSalidas = new Set<string>();
  const idsVehiculos = new Set<string>();
  const idsChoferes = new Set<string>();
  const idsReservasFaltantes = new Set<string>();

  for (const registro of registros) {
    if (registro.entityType === "Departure") idsSalidas.add(registro.entityId);
    if (registro.entityType === "Vehicle") idsVehiculos.add(registro.entityId);
    if (registro.entityType === "Driver") idsChoferes.add(registro.entityId);
    if (registro.entityType === "Reservation" && !codigoPorReserva.has(registro.entityId)) {
      idsReservasFaltantes.add(registro.entityId);
    }
  }

  const [salidas, vehiculos, choferes, reservasFaltantes] = await Promise.all([
    idsSalidas.size > 0
      ? prisma.departure.findMany({
          where: { id: { in: [...idsSalidas] }, route: { agencyId } },
          include: { route: true },
        })
      : Promise.resolve([]),
    idsVehiculos.size > 0
      ? prisma.vehicle.findMany({ where: { id: { in: [...idsVehiculos] }, agencyId } })
      : Promise.resolve([]),
    idsChoferes.size > 0
      ? prisma.driver.findMany({ where: { id: { in: [...idsChoferes] }, agencyId } })
      : Promise.resolve([]),
    idsReservasFaltantes.size > 0
      ? prisma.reservation.findMany({
          where: { id: { in: [...idsReservasFaltantes] }, departure: { route: { agencyId } } },
          select: { id: true, code: true },
        })
      : Promise.resolve([]),
  ]);

  const subjetoPorSalida = new Map(
    salidas.map((s) => [s.id, `${s.route.name} · ${formatCaracas(s.departsAt, "dd/MM HH:mm")}`]),
  );
  const placaPorVehiculo = new Map(vehiculos.map((v) => [v.id, v.plate]));
  const nombrePorChofer = new Map(choferes.map((d) => [d.id, d.fullName]));
  for (const r of reservasFaltantes) codigoPorReserva.set(r.id, r.code);

  function subjectFor(registro: (typeof registros)[number]): string | null {
    switch (registro.entityType) {
      case "Reservation":
        return codigoPorReserva.get(registro.entityId) ?? null;
      case "PaymentProof": {
        const reservationId = reservaPorComprobante.get(registro.entityId);
        return reservationId ? (codigoPorReserva.get(reservationId) ?? null) : null;
      }
      case "Departure":
        return subjetoPorSalida.get(registro.entityId) ?? null;
      case "Vehicle":
        return placaPorVehiculo.get(registro.entityId) ?? null;
      case "Driver":
        return nombrePorChofer.get(registro.entityId) ?? null;
      default:
        return null;
    }
  }

  const rows: ActivityRow[] = registros.map((registro) => {
    const entry: ActivityEntry = {
      id: registro.id,
      at: registro.createdAt,
      actorType: registro.actorType,
      actorName: registro.actorPanelUserId
        ? (nombrePorUsuario.get(registro.actorPanelUserId) ?? null)
        : null,
      action: registro.action,
      entityType: registro.entityType,
      subject: subjectFor(registro),
      after: registro.after as Record<string, unknown>,
    };
    const { text, tone } = describeActivity(entry);
    return { id: entry.id, at: entry.at, text, tone };
  });

  return { rows, truncated };
}
