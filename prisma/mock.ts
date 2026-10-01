/**
 * Generador de datos de demostración con volumen realista.
 *
 * Crea alrededor de 1500 cuentas de pasajero, salidas de los días anteriores ya
 * finalizadas, y reservas repartidas en todos los estados del sistema, para ver
 * cómo se comporta la interfaz en un día normal de operación del terminal.
 *
 * Requiere que `pnpm seed` haya cargado antes las agencias, rutas, flota,
 * métodos de pago, tasa de salida y tasas de cambio.
 *
 * Uso:  pnpm mock            (añade datos)
 *       pnpm mock --reset    (borra los datos de operación y los vuelve a crear)
 */
import { randomUUID } from "node:crypto";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { PrismaClient, Prisma } from "@prisma/client";
import type { Currency, PaymentMethod, ReservationStatus } from "@prisma/client";
import argon2 from "argon2";
import { formatMoney } from "@/lib/decimal";
import { getEnv } from "@/lib/env";
import { formatCaracasDateTime24 } from "@/lib/time";

const prisma = new PrismaClient();

/** Días hacia atrás con operación ya cerrada. */
const DIAS_PASADOS = 12;
/** Cuentas de pasajero a generar. */
const CUENTAS = 1500;
/** Antigüedad máxima de registro de una cuenta, en días. */
const ANTIGUEDAD_MAX_DIAS = 180;

/**
 * Cuentas documentadas en el README. Se recrean siempre, porque el reinicio
 * borra las que dejó el seed y sin ellas nadie puede entrar como pasajero.
 */
const PASAJEROS_FIJOS = [
  {
    idNumber: "V12345678",
    givenNames: "Ana",
    surnames: "Pérez Rivas",
    fullName: "Ana Pérez Rivas",
    phone: "+584121112233",
    birthYear: 1993,
  },
  {
    idNumber: "V87654321",
    givenNames: "Luis",
    surnames: "Gómez Salas",
    fullName: "Luis Gómez Salas",
    phone: "+584141112233",
    birthYear: 1986,
  },
] as const;

const NOMBRES = [
  "Ana", "Luis", "María", "José", "Carmen", "Carlos", "Rosa", "Pedro", "Yubisay", "Rafael",
  "Gabriela", "Jesús", "Yolanda", "Miguel", "Zuleima", "Antonio", "Marisol", "Freddy",
  "Nubia", "Alexander", "Yaneth", "Wilmer", "Coromoto", "Douglas", "Milagros", "Argenis",
  "Betzabeth", "Endher", "Yorman", "Deisy", "Franklin", "Oriana", "Yeison", "Maribel",
  "Joel", "Katiuska", "Ramón", "Neida", "Gustavo", "Solangel", "Eduardo", "Mairelys",
];
const APELLIDOS = [
  "Pérez", "Rodríguez", "González", "Martínez", "Hernández", "Rivas", "Mora", "Duque",
  "Pino", "Marcano", "Ríos", "Salas", "Gómez", "Colmenares", "Zambrano", "Contreras",
  "Sánchez", "Ramírez", "Torres", "Guerrero", "Márquez", "Bastidas", "Quintero", "Peña",
  "Sivira", "Escalona", "Villegas", "Uzcátegui", "Chirinos", "Nava", "Piñero", "Yépez",
];

function elegir<T>(lista: readonly T[]): T {
  return lista[Math.floor(Math.random() * lista.length)]!;
}

function entero(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Devuelve true con la probabilidad indicada, entre 0 y 1. */
function suerte(probabilidad: number): boolean {
  return Math.random() < probabilidad;
}

/** Tamaño de grupo con la distribución que se ve en taquilla. */
function tamanoGrupo(): number {
  const r = Math.random();
  if (r < 0.55) return 1;
  if (r < 0.8) return 2;
  if (r < 0.9) return 3;
  if (r < 0.96) return 4;
  if (r < 0.98) return 5;
  return 6;
}

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const serialesUsados = new Set<string>();

function serialUnico(departsAt: Date, pasajeros: number): string {
  // Mismo formato que genera el sistema: TR-MMDD-NPAX-XXXX en hora de Caracas.
  const caracas = new Date(departsAt.getTime() - 4 * 3_600_000);
  const mes = String(caracas.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(caracas.getUTCDate()).padStart(2, "0");
  for (let intento = 0; intento < 40; intento += 1) {
    let sufijo = "";
    for (let i = 0; i < 4; i += 1) sufijo += elegir([...ALFABETO]);
    const code = `TR-${mes}${dia}-${pasajeros}PAX-${sufijo}`;
    if (!serialesUsados.has(code)) {
      serialesUsados.add(code);
      return code;
    }
  }
  throw new Error("No se pudo generar un serial único");
}

function cedulaUnica(usadas: Set<string>): string {
  for (let intento = 0; intento < 60; intento += 1) {
    const cedula = `V${entero(4_000_000, 32_999_999)}`;
    if (!usadas.has(cedula)) {
      usadas.add(cedula);
      return cedula;
    }
  }
  throw new Error("No se pudo generar una cédula única");
}

function telefono(): string {
  return `+58${elegir(["412", "414", "416", "424", "426"])}${entero(1_000_000, 9_999_999)}`;
}

interface NombreGenerado {
  givenNames: string;
  surnames: string;
  fullName: string;
}

/** Genera un nombre y dos apellidos, como los produce el registro real. */
function nombreCompleto(): NombreGenerado {
  const givenNames = elegir(NOMBRES);
  const surnames = `${elegir(APELLIDOS)} ${elegir(APELLIDOS)}`;
  return { givenNames, surnames, fullName: `${givenNames} ${surnames}` };
}

function dec(valor: Prisma.Decimal | string | number): Prisma.Decimal {
  return new Prisma.Decimal(valor);
}

function redondear(valor: Prisma.Decimal): Prisma.Decimal {
  return valor.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

function masMinutos(fecha: Date, minutos: number): Date {
  return new Date(fecha.getTime() + minutos * MIN);
}

function minFecha(a: Date, b: Date): Date {
  return a <= b ? a : b;
}

function maxFecha(a: Date, b: Date): Date {
  return a >= b ? a : b;
}

/** Instante al azar entre dos fechas; si el rango está vacío, la primera. */
function entre(desde: Date, hasta: Date): Date {
  const a = desde.getTime();
  const b = hasta.getTime();
  if (b <= a) return new Date(a);
  return new Date(a + Math.floor(Math.random() * (b - a)));
}

/** Fecha de calendario en hora de Caracas (UTC-4), como "2026-10-01". */
function diaCaracas(fecha: Date): string {
  return new Date(fecha.getTime() - 4 * HORA).toISOString().slice(0, 10);
}

/** Horas de descanso de la unidad y del chofer entre la llegada y la siguiente salida. */
const DESCANSO_MIN = 6 * 60;
/** La unidad debe estar en el terminal antes de que empiece el embarque. */
const PREPARACION_MIN = 60;

/**
 * Vehículo o chofer libre para una salida: de los que ya llegaron y
 * descansaron, el que lleva más tiempo sin viajar. Así nunca se solapan dos
 * viajes de la misma unidad y el trabajo se reparte entre toda la flota.
 */
function unidadLibre<T extends { id: string }>(
  unidades: readonly T[],
  libres: Map<string, number>,
  departsAt: Date,
): T | null {
  const limite = departsAt.getTime() - PREPARACION_MIN * MIN;
  let mejor: T | null = null;
  let mejorLibre = Number.POSITIVE_INFINITY;
  for (const unidad of unidades) {
    const libre = libres.get(unidad.id) ?? Number.NEGATIVE_INFINITY;
    if (libre <= limite && libre < mejorLibre) {
      mejor = unidad;
      mejorLibre = libre;
    }
  }
  return mejor;
}

/** Solo mayores de edad en las cuentas y acompañantes generados: un menor necesita permiso de viaje. */
const ANIO_NACIMIENTO_MAX = new Date().getUTCFullYear() - 19;

interface DatosGenerados {
  ahora: Date;
  cuentas: readonly { id: string; fullName: string; phone: string; createdAt: Date }[];
  metodos: readonly PaymentMethod[];
  reservas: readonly Prisma.ReservationCreateManyInput[];
  mensajes: readonly Prisma.OutboundMessageCreateManyInput[];
  comprobantes: readonly Prisma.PaymentProofCreateManyInput[];
  efectivo: readonly Prisma.CashPaymentCreateManyInput[];
  tickets: readonly Prisma.TicketCreateManyInput[];
  viajes: readonly Prisma.TripLogCreateManyInput[];
  /** Salidas futuras del seed, con su ocupación estimada de la unidad. */
  programadas: readonly OcupacionProgramada[];
  bitacora: readonly Prisma.AuditLogCreateManyInput[];
}

/** Tiempo en que una salida programada ocupa su vehículo y su chofer. */
interface OcupacionProgramada {
  departureId: string;
  vehicleId: string;
  driverId: string;
  /** Inicio del embarque: la unidad ya debe estar en el terminal. */
  desde: number;
  /** Llegada estimada con el peor retraso de la operación. */
  hasta: number;
}

/**
 * Ocupación de una salida programada: desde la preparación previa al embarque
 * hasta la llegada con el peor retraso que se registra (25 % del tiempo
 * estimado y 25 minutos de salida tardía), igual que en `prisma/seed.ts`.
 */
function ocupacionProgramada(salida: {
  id: string;
  vehicleId: string;
  driverId: string;
  departsAt: Date;
  estimatedMinutes: number;
}): OcupacionProgramada {
  const inicio = salida.departsAt.getTime();
  return {
    departureId: salida.id,
    vehicleId: salida.vehicleId,
    driverId: salida.driverId,
    desde: inicio - PREPARACION_MIN * MIN,
    hasta: inicio + (salida.estimatedMinutes * 1.25 + 25) * MIN,
  };
}

/** Unidades (vehículo o chofer) con dos tramos de ocupación que se cruzan. */
function unidadesSolapadas(
  tramos: readonly { vehicleId: string; driverId: string; desde: number; hasta: number }[],
): string[] {
  const solapadas: string[] = [];
  for (const campo of ["vehicleId", "driverId"] as const) {
    const porUnidad = new Map<string, { desde: number; hasta: number }[]>();
    for (const tramo of tramos) {
      const lista = porUnidad.get(tramo[campo]) ?? [];
      lista.push({ desde: tramo.desde, hasta: tramo.hasta });
      porUnidad.set(tramo[campo], lista);
    }
    for (const [unidad, lista] of porUnidad) {
      lista.sort((a, b) => a.desde - b.desde);
      for (let i = 1; i < lista.length; i += 1) {
        if (lista[i]!.desde < lista[i - 1]!.hasta) {
          solapadas.push(`${campo} ${unidad}`);
          break;
        }
      }
    }
  }
  return solapadas;
}

function ms(valor: Date | string | null | undefined): number | null {
  return valor ? new Date(valor).getTime() : null;
}

/**
 * Revisa, antes de insertar, las reglas que los datos de demostración deben
 * respetar para no mostrar nada imposible: fechas nunca posteriores a ahora y
 * en orden, mensajes a nombre del titular de su reserva, plantillas según el
 * método y el estado, pagos que suman lo abonado y unidades sin viajes
 * solapados. Si algo falla, la carga se detiene sin escribir nada.
 */
function verificarCoherencia(datos: DatosGenerados): void {
  const problemas: string[] = [];
  const ahora = datos.ahora.getTime();
  const cuentaPorId = new Map(datos.cuentas.map((c) => [c.id, c]));
  const metodoPorId = new Map(datos.metodos.map((m) => [m.id, m]));
  const reservaPorId = new Map(datos.reservas.map((r) => [r.id as string, r]));
  const futuro = (valor: Date | string | null | undefined) => (ms(valor) ?? 0) > ahora;

  const pagado = new Map<string, Prisma.Decimal>();
  const sumar = (reservationId: string, monto: Prisma.Decimal.Value) =>
    pagado.set(reservationId, (pagado.get(reservationId) ?? dec(0)).add(new Prisma.Decimal(monto)));

  for (const r of datos.reservas) {
    const creada = ms(r.createdAt) ?? 0;
    const cuenta = cuentaPorId.get(r.accountId);
    const metodo = metodoPorId.get(r.paymentMethodId);
    if (futuro(r.createdAt) || futuro(r.updatedAt)) problemas.push(`${r.code}: fecha futura`);
    if (!cuenta || cuenta.createdAt.getTime() > creada) {
      problemas.push(`${r.code}: la cuenta no existía al reservar`);
    }
    const pago = ms(r.paidAt);
    if (pago !== null && (pago < creada || pago > ahora)) problemas.push(`${r.code}: paidAt fuera de rango`);
    if (r.status === "PENDIENTE_PAGO" && (ms(r.expiresAt) ?? 0) <= ahora) {
      problemas.push(`${r.code}: sin pago y con el plazo de 2 horas vencido`);
    }
    if (
      metodo?.kind === "FISICO" &&
      ["ABONADA", "EN_VALIDACION", "PENDIENTE_PAGO"].includes(r.status ?? "")
    ) {
      problemas.push(`${r.code}: ${r.status} con un método de pago físico`);
    }
  }

  for (const m of datos.mensajes) {
    if (futuro(m.createdAt) || futuro(m.sentAt) || futuro(m.scheduledFor)) {
      problemas.push(`Mensaje ${m.templateKey}: fecha futura`);
    }
    if (!m.reservationId) continue;
    const reserva = reservaPorId.get(m.reservationId);
    const cuenta = reserva ? cuentaPorId.get(reserva.accountId) : undefined;
    const nombre = (m.payload as Record<string, unknown>).nombre;
    if (!reserva || !cuenta || nombre !== cuenta.fullName || m.phone !== cuenta.phone) {
      problemas.push(`Mensaje ${m.templateKey} de ${reserva?.code}: no va dirigido al titular`);
      continue;
    }
    if ((ms(m.createdAt) ?? 0) < (ms(reserva.createdAt) ?? 0)) {
      problemas.push(`Mensaje ${m.templateKey} de ${reserva.code}: anterior a la reserva`);
    }
    const kind = metodoPorId.get(reserva.paymentMethodId)?.kind;
    const esperado = kind === "FISICO" ? "reserva_condicional" : "solicitud_recibida";
    const otro = kind === "FISICO" ? "solicitud_recibida" : "reserva_condicional";
    if (m.templateKey === otro) {
      problemas.push(`Mensaje de ${reserva.code}: ${otro} en lugar de ${esperado}`);
    }
  }

  for (const t of datos.tickets) {
    const reserva = reservaPorId.get(t.reservationId);
    if (futuro(t.issuedAt) || (ms(t.issuedAt) ?? 0) < (ms(reserva?.createdAt) ?? 0)) {
      problemas.push(`Ticket de ${reserva?.code}: emitido fuera de rango`);
    }
  }

  for (const c of datos.comprobantes) {
    const reserva = reservaPorId.get(c.reservationId);
    if (futuro(c.createdAt) || futuro(c.reviewedAt)) problemas.push(`Comprobante de ${reserva?.code}: fecha futura`);
    if ((ms(c.createdAt) ?? 0) < (ms(reserva?.createdAt) ?? 0)) {
      problemas.push(`Comprobante de ${reserva?.code}: anterior a la reserva`);
    }
    if (c.status === "APROBADO") sumar(c.reservationId, c.amountUsd as Prisma.Decimal.Value);
  }
  for (const e of datos.efectivo) {
    if (futuro(e.collectedAt)) problemas.push("Cobro en efectivo con fecha futura");
    sumar(e.reservationId, e.amountUsd as Prisma.Decimal.Value);
  }
  for (const r of datos.reservas) {
    const registrado = pagado.get(r.id as string) ?? dec(0);
    if (!registrado.equals(new Prisma.Decimal((r.paidUsd ?? 0) as Prisma.Decimal.Value))) {
      problemas.push(`${r.code}: los pagos registrados no suman lo abonado`);
    }
  }

  for (const b of datos.bitacora) {
    if (futuro(b.createdAt)) problemas.push(`Bitácora ${b.action}: fecha futura`);
    const reserva = b.entityType === "Reservation" ? reservaPorId.get(b.entityId) : undefined;
    if (reserva && b.actorType === "PASAJERO" && b.actorAccountId !== reserva.accountId) {
      problemas.push(`Bitácora de ${reserva.code}: la creó otra cuenta`);
    }
  }

  // Ningún vehículo ni chofer puede estar en dos viajes a la vez, ni entre los
  // ya cumplidos ni entre estos y las salidas programadas.
  for (const v of datos.viajes) {
    if (futuro(v.departedAt) || futuro(v.arrivedAt)) problemas.push("Viaje cumplido con fecha futura");
  }
  const tramos = [
    ...datos.viajes.map((v) => ({
      vehicleId: v.vehicleId,
      driverId: v.driverId,
      desde: ms(v.departedAt) ?? 0,
      hasta: ms(v.arrivedAt) ?? 0,
    })),
    ...datos.programadas,
  ];
  for (const unidad of unidadesSolapadas(tramos)) {
    problemas.push(`Viajes solapados de ${unidad}`);
  }

  if (problemas.length > 0) {
    throw new Error(
      `Los datos de demostración no son coherentes (${problemas.length} problemas):\n  ${problemas
        .slice(0, 20)
        .join("\n  ")}`,
    );
  }
}

/** Imágenes de demostración versionadas en el repositorio. */
const IMAGEN_COMPROBANTE = path.resolve("prisma/mock-assets/comprobante-demo.png");
const IMAGEN_CEDULA = path.resolve("prisma/mock-assets/cedula-demo.png");

/**
 * Copia una imagen de demostración a cada ruta relativa generada, dentro de la
 * misma carpeta de subidas que usa `src/lib/storage.ts` (UPLOADS_DIR), para
 * que el visor del panel y la sección de documentos no muestren imágenes rotas.
 */
async function escribirImagenes(origen: string, rutas: readonly string[]): Promise<void> {
  const base = path.resolve(getEnv().UPLOADS_DIR);
  for (let i = 0; i < rutas.length; i += 100) {
    await Promise.all(
      rutas.slice(i, i + 100).map(async (relativa) => {
        const destino = path.resolve(base, relativa);
        if (!destino.startsWith(base + path.sep)) {
          throw new Error(`Ruta de imagen fuera de la carpeta de subidas: ${relativa}`);
        }
        await mkdir(path.dirname(destino), { recursive: true });
        await copyFile(origen, destino);
      }),
    );
  }
}

async function limpiarOperacion(): Promise<void> {
  // Se borra solo lo que genera este archivo; el catálogo del seed queda intacto.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "OutboundMessage", "Ticket", "PaymentProof", "CashPayment", "Passenger",
      "WaitlistEntry", "Reservation", "TripLog", "PassengerDocument",
      "PassengerSession", "PassengerAccount", "AuditLog"
    RESTART IDENTITY CASCADE
  `);
  await prisma.departure.deleteMany({ where: { departsAt: { lt: new Date() } } });
}

async function main(): Promise<void> {
  const reset = process.argv.includes("--reset");

  const agencias = await prisma.agency.count();
  if (agencias === 0) {
    process.stderr.write("Primero ejecuta `pnpm seed` para cargar agencias, rutas y flota.\n");
    process.exitCode = 1;
    return;
  }

  // Las salidas futuras las crea el seed y este archivo no las toca. Si una base
  // sembrada con una versión anterior trae una unidad en dos salidas que se
  // cruzan, se detiene aquí, antes de borrar nada, para que no llegue al tablero.
  const solapesDelSeed = unidadesSolapadas(
    (
      await prisma.departure.findMany({
        where: { departsAt: { gte: new Date() } },
        include: { route: { select: { estimatedMinutes: true } } },
      })
    ).map((d) => ocupacionProgramada({ ...d, estimatedMinutes: d.route.estimatedMinutes })),
  );
  if (solapesDelSeed.length > 0) {
    process.stderr.write(
      [
        `Salidas programadas solapadas: ${solapesDelSeed.length} unidades tienen dos salidas que se cruzan.`,
        "La base se sembró con una versión anterior del seed. Regenérala completa:",
        "  pnpm exec dotenv -e .env -- prisma migrate reset --force --skip-seed",
        "  pnpm seed",
        "  pnpm mock",
        "",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  if (reset) {
    process.stdout.write("Borrando datos de operación anteriores...\n");
    await limpiarOperacion();
  } else if ((await prisma.passengerAccount.count()) > 100) {
    process.stdout.write(
      "Ya hay datos de operación cargados. Usa `pnpm mock --reset` para regenerarlos.\n",
    );
    return;
  }

  const ahora = new Date();
  const tasaSalida = await prisma.departureTax.findFirstOrThrow({
    orderBy: { effectiveFrom: "desc" },
  });
  const metodos = await prisma.paymentMethod.findMany({ where: { active: true } });
  const digitales = metodos.filter((m) => m.kind === "DIGITAL");
  const fisicos = metodos.filter((m) => m.kind === "FISICO");
  const tasas = new Map<Currency, Prisma.Decimal>();
  for (const fila of await prisma.exchangeRate.findMany({ orderBy: { effectiveFrom: "asc" } })) {
    tasas.set(fila.currency, fila.rateFromUsd);
  }

  // --- Salidas de días anteriores, ya finalizadas -------------------------
  process.stdout.write("Creando salidas de los días anteriores...\n");

  const rutas = await prisma.route.findMany({
    include: { agency: true, departures: { take: 1, orderBy: { departsAt: "asc" } } },
  });
  const vehiculosPorAgencia = new Map<string, { id: string; seatCount: number }[]>();
  const choferesPorAgencia = new Map<string, { id: string }[]>();
  for (const agencia of await prisma.agency.findMany({
    include: { vehicles: true, drivers: true },
  })) {
    vehiculosPorAgencia.set(
      agencia.id,
      agencia.vehicles.map((v) => ({ id: v.id, seatCount: v.seatCount })),
    );
    choferesPorAgencia.set(agencia.id, agencia.drivers.map((d) => ({ id: d.id })));
  }

  const RECOMENDACION_GENERAL = "Llega 30 minutos antes con tu cédula en mano.";

  interface SalidaMock {
    id: string;
    routeId: string;
    agencyId: string;
    vehicleId: string;
    driverId: string;
    departsAt: Date;
    capacity: number;
    fareUsd: Prisma.Decimal;
    estimatedMinutes: number;
    meetingPoint: string;
    recomendaciones: string;
    pasada: boolean;
    /** Hora real de partida y de llegada; solo en las salidas ya cumplidas. */
    partida: Date | null;
    llegada: Date | null;
  }

  type Candidata = Omit<SalidaMock, "vehicleId" | "driverId" | "capacity" | "partida" | "llegada"> & {
    partida: Date;
    llegada: Date;
  };

  // Una salida por ruta y por día, con su hora real de partida y de llegada
  // (el retraso o el adelanto que se ve en la operación).
  const candidatas: Candidata[] = [];
  for (const ruta of rutas) {
    // Se reutiliza el horario de la primera salida ya sembrada de esa ruta.
    const referencia = ruta.departures[0];
    if (!referencia) continue;
    const horaUtc = referencia.departsAt.getUTCHours();

    for (let dia = DIAS_PASADOS; dia >= 1; dia -= 1) {
      const departsAt = new Date(ahora);
      departsAt.setUTCDate(departsAt.getUTCDate() - dia);
      departsAt.setUTCHours(horaUtc, 0, 0, 0);
      if (departsAt >= ahora) continue;

      const partida = masMinutos(departsAt, entero(-5, 25));
      const duracion = Math.round(ruta.estimatedMinutes * (1 + entero(-12, 25) / 100));
      const llegada = masMinutos(partida, duracion);
      // Solo viajes ya cumplidos: uno que todavía va en camino no puede figurar
      // como finalizado ni con una hora de llegada que aún no ocurrió.
      if (llegada >= ahora) continue;
      candidatas.push({
        id: randomUUID(),
        routeId: ruta.id,
        agencyId: ruta.agencyId,
        departsAt,
        fareUsd: ruta.fareUsd,
        estimatedMinutes: ruta.estimatedMinutes,
        meetingPoint: ruta.meetingPoint,
        recomendaciones: ruta.travelTips ?? RECOMENDACION_GENERAL,
        pasada: true,
        partida,
        llegada,
      });
    }
  }
  candidatas.sort((a, b) => a.departsAt.getTime() - b.departsAt.getTime());

  // Salidas futuras ya sembradas: los últimos viajes cumplidos no pueden
  // dejar a una unidad ocupada cuando le toca la primera de ellas.
  const futuras = await prisma.departure.findMany({
    where: { departsAt: { gte: ahora } },
    include: { route: true },
  });
  const primeraProgramada = new Map<string, number>();
  for (const d of futuras) {
    const embarque = d.departsAt.getTime() - PREPARACION_MIN * MIN;
    for (const unidad of [d.vehicleId, d.driverId]) {
      primeraProgramada.set(unidad, Math.min(primeraProgramada.get(unidad) ?? Infinity, embarque));
    }
  }

  // Cada salida recibe un vehículo y un chofer que ya llegaron de su viaje
  // anterior y descansaron, y que volverán a tiempo para su próxima salida
  // programada. Si no hay ninguno libre, la salida no se crea: nunca se
  // asigna una unidad ocupada.
  const libreVehiculo = new Map<string, number>();
  const libreChofer = new Map<string, number>();
  const salidasFiltradas: SalidaMock[] = [];
  for (const candidata of candidatas) {
    const libre = candidata.llegada.getTime() + DESCANSO_MIN * MIN;
    const aTiempo = (unidad: { id: string }) =>
      libre <= (primeraProgramada.get(unidad.id) ?? Infinity);
    const vehiculo = unidadLibre(
      (vehiculosPorAgencia.get(candidata.agencyId) ?? []).filter(aTiempo),
      libreVehiculo,
      candidata.departsAt,
    );
    const chofer = unidadLibre(
      (choferesPorAgencia.get(candidata.agencyId) ?? []).filter(aTiempo),
      libreChofer,
      candidata.departsAt,
    );
    if (!vehiculo || !chofer) continue;
    libreVehiculo.set(vehiculo.id, libre);
    libreChofer.set(chofer.id, libre);
    salidasFiltradas.push({
      ...candidata,
      vehicleId: vehiculo.id,
      driverId: chofer.id,
      capacity: vehiculo.seatCount,
    });
  }

  await prisma.departure.createMany({
    data: salidasFiltradas.map((s) => ({
      id: s.id,
      routeId: s.routeId,
      vehicleId: s.vehicleId,
      driverId: s.driverId,
      departsAt: s.departsAt,
      capacity: s.capacity,
      status: "FINALIZADA" as const,
      manifestClosedAt: new Date(s.departsAt.getTime() - 40 * MIN),
    })),
  });

  // --- Salidas futuras ya sembradas --------------------------------------
  const todas: SalidaMock[] = [
    ...salidasFiltradas,
    ...futuras.map((d) => ({
      id: d.id,
      routeId: d.routeId,
      agencyId: d.route.agencyId,
      vehicleId: d.vehicleId,
      driverId: d.driverId,
      departsAt: d.departsAt,
      capacity: d.capacity,
      fareUsd: d.route.fareUsd,
      estimatedMinutes: d.route.estimatedMinutes,
      meetingPoint: d.route.meetingPoint,
      recomendaciones: d.route.travelTips ?? RECOMENDACION_GENERAL,
      pasada: false,
      partida: null,
      llegada: null,
    })),
  ];

  // --- Cuentas de pasajero ------------------------------------------------
  process.stdout.write(`Creando ${CUENTAS} cuentas de pasajero...\n`);

  // El hash de argon2 es deliberadamente lento; para datos de prueba se calcula
  // una sola vez y se reutiliza. Todas comparten la contraseña Pasajero.2026.
  const hashCompartido = await argon2.hash("Pasajero.2026", { type: argon2.argon2id });

  const cedulasUsadas = new Set<string>(PASAJEROS_FIJOS.map((p) => p.idNumber));

  const cuentasFijas = PASAJEROS_FIJOS.map((fijo) => {
    const registro = new Date(ahora.getTime() - 90 * DIA);
    return {
      id: randomUUID(),
      idNumber: fijo.idNumber,
      givenNames: fijo.givenNames,
      surnames: fijo.surnames,
      fullName: fijo.fullName,
      phone: fijo.phone,
      birthYear: fijo.birthYear,
      passwordHash: hashCompartido,
      createdAt: registro,
      updatedAt: registro,
      lastLoginAt: new Date(ahora.getTime() - entero(1, 48) * HORA),
    };
  });

  const cuentasAleatorias = Array.from({ length: CUENTAS - cuentasFijas.length }, () => {
    const registro = new Date(
      ahora.getTime() - entero(0, ANTIGUEDAD_MAX_DIAS) * DIA - entero(0, 86_400) * 1000,
    );
    const nombre = nombreCompleto();
    return {
      id: randomUUID(),
      idNumber: cedulaUnica(cedulasUsadas),
      givenNames: nombre.givenNames,
      surnames: nombre.surnames,
      fullName: nombre.fullName,
      phone: telefono(),
      // Solo mayores de edad: un menor necesita permiso de viaje para reservar.
      birthYear: entero(1955, ANIO_NACIMIENTO_MAX),
      passwordHash: hashCompartido,
      createdAt: registro,
      updatedAt: registro,
      // La última actividad va entre el registro y ahora; nunca en el futuro.
      lastLoginAt: suerte(0.7)
        ? new Date(registro.getTime() + Math.random() * (ahora.getTime() - registro.getTime()))
        : null,
    };
  });

  const cuentas = [...cuentasFijas, ...cuentasAleatorias];

  for (let i = 0; i < cuentas.length; i += 500) {
    await prisma.passengerAccount.createMany({ data: cuentas.slice(i, i + 500) });
  }

  // Casi todos tienen la cédula cargada; algunos aún no la suben.
  const documentos = cuentas
    .filter((c) => PASAJEROS_FIJOS.some((f) => f.idNumber === c.idNumber) || suerte(0.92))
    .map((c) => ({
      id: randomUUID(),
      accountId: c.id,
      type: "CEDULA" as const,
      filePath: `documentos/${c.id}/cedula.png`,
      originalName: "cedula.png",
      uploadedAt: c.createdAt,
    }));
  for (let i = 0; i < documentos.length; i += 500) {
    await prisma.passengerDocument.createMany({ data: documentos.slice(i, i + 500) });
  }

  // Sin la foto de la cédula no se puede reservar. Las cuentas del README
  // quedan fuera del reparto al azar: sus reservas se eligen más abajo.
  const idsConCedula = new Set(documentos.map((d) => d.accountId));
  const cuentasQueReservan = cuentasAleatorias.filter((c) => idsConCedula.has(c.id));
  const cuentaMasAntigua = cuentasQueReservan.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b));

  /** Una cuenta que ya existía, con su cédula cargada, cuando se hizo la reserva. */
  function cuentaPara(creada: Date): (typeof cuentas)[number] {
    const tope = creada.getTime() - 10 * MIN;
    for (let intento = 0; intento < 40; intento += 1) {
      const cuenta = elegir(cuentasQueReservan);
      if (cuenta.createdAt.getTime() <= tope) return cuenta;
    }
    return cuentaMasAntigua;
  }

  // --- Reservas -----------------------------------------------------------
  process.stdout.write("Creando reservas, pagos, tickets y recorridos...\n");

  const reservas: Prisma.ReservationCreateManyInput[] = [];
  const pasajeros: Prisma.PassengerCreateManyInput[] = [];
  const comprobantes: Prisma.PaymentProofCreateManyInput[] = [];
  const efectivo: Prisma.CashPaymentCreateManyInput[] = [];
  const tickets: Prisma.TicketCreateManyInput[] = [];
  const mensajes: Prisma.OutboundMessageCreateManyInput[] = [];
  const viajes: Prisma.TripLogCreateManyInput[] = [];
  const espera: Prisma.WaitlistEntryCreateManyInput[] = [];
  const bitacora: Prisma.AuditLogCreateManyInput[] = [];

  const operadoresPorAgencia = new Map<string, string>();
  for (const usuario of await prisma.panelUser.findMany({ where: { role: "OPERADOR" } })) {
    if (usuario.agencyId) operadoresPorAgencia.set(usuario.agencyId, usuario.id);
  }

  function montos(fareUsd: Prisma.Decimal, pax: number, metodo: PaymentMethod) {
    const fareTotalUsd = redondear(fareUsd.mul(pax));
    const taxTotalUsd = redondear(tasaSalida.amountUsd.mul(pax));
    const totalUsd = redondear(fareTotalUsd.add(taxTotalUsd));
    const tasa =
      metodo.currency === "USD" || metodo.currency === "USDT"
        ? dec(1)
        : (tasas.get(metodo.currency) ?? dec(1));
    return {
      fareTotalUsd,
      taxTotalUsd,
      totalUsd,
      exchangeRateUsed: tasa,
      amountInCurrency: redondear(totalUsd.mul(tasa)),
    };
  }

  /** Estados en los que la reserva ocupa un puesto de la unidad. */
  const SIN_PUESTO = new Set<ReservationStatus>(["LIBERADA", "CANCELADA"]);
  /** Estados con el pago completo: tienen ticket emitido. */
  const PAGO_COMPLETO = new Set<ReservationStatus>(["PAGADA", "ABORDADA", "NO_SHOW"]);
  /** Estados con algún pago registrado. */
  const CON_PAGO = new Set<ReservationStatus>([...PAGO_COMPLETO, "ABONADA", "CANCELADA"]);

  // Marca las dos primeras reservas pagadas con método físico en salidas
  // próximas como vendidas en taquilla, para ver ese canal en el panel.
  let ventasEnTaquillaMarcadas = 0;

  for (const salida of todas) {
    const operador = operadoresPorAgencia.get(salida.agencyId);
    if (!operador) continue;

    // Ocupación típica: más llena en salidas pasadas que en las de dentro de días.
    const diasHasta = (salida.departsAt.getTime() - ahora.getTime()) / DIA;
    const ocupacionObjetivo = salida.pasada
      ? entero(58, 96) / 100
      : diasHasta < 1
        ? entero(55, 92) / 100
        : diasHasta < 3
          ? entero(30, 70) / 100
          : entero(8, 40) / 100;

    let ocupados = 0;
    const limite = Math.floor(salida.capacity * ocupacionObjetivo);
    let abordados = 0;
    const corte12 = masMinutos(salida.departsAt, -12 * 60);
    const estadoMensaje = salida.pasada ? ("LEIDO" as const) : ("ENTREGADO" as const);
    const salidaTexto = formatCaracasDateTime24(salida.departsAt);

    while (ocupados < limite) {
      const pax = Math.min(tamanoGrupo(), limite - ocupados);
      if (pax < 1) break;

      // El estado define el método de pago posible: un método físico nace en
      // PAGO_EN_SITIO y solo pasa a PAGADA o LIBERADA; los abonos y los
      // comprobantes en revisión son siempre de métodos digitales.
      let status: ReservationStatus;
      let fisico: boolean;
      const r = Math.random();
      if (salida.pasada) {
        // Un día ya cerrado: casi todos viajaron, algunos no se presentaron.
        if (r < 0.86) {
          status = "ABORDADA";
          fisico = suerte(0.35);
        } else if (r < 0.93) {
          status = "NO_SHOW";
          fisico = suerte(0.35);
        } else if (r < 0.97) {
          // Abonada que nunca completó el pago: se cancela al registrar la salida.
          status = "CANCELADA";
          fisico = false;
        } else {
          // Pago en sitio que llegó a 12 horas de la salida sin pagar.
          status = "LIBERADA";
          fisico = true;
        }
      } else if (r < 0.46) {
        status = "PAGADA";
        fisico = suerte(0.35);
      } else if (r < 0.58) {
        status = "ABONADA";
        fisico = false;
      } else if (r < 0.7) {
        status = "EN_VALIDACION";
        fisico = false;
      } else if (r < 0.82) {
        status = "PAGO_EN_SITIO";
        fisico = true;
      } else if (r < 0.88) {
        status = "PENDIENTE_PAGO";
        fisico = false;
      } else {
        // Sin ningún pago a las 2 horas de creada.
        status = "LIBERADA";
        fisico = false;
      }
      // Un pago en sitio sin pagar a 12 horas de la salida ya se liberó.
      if (status === "PAGO_EN_SITIO" && corte12 <= ahora) status = "LIBERADA";

      if (!SIN_PUESTO.has(status)) ocupados += pax;

      const metodo = fisico ? elegir(fisicos) : elegir(digitales);
      const m = montos(salida.fareUsd, pax, metodo);
      const code = serialUnico(salida.departsAt, pax);
      const reservationId = randomUUID();

      const ventaEnTaquilla =
        !salida.pasada && status === "PAGADA" && fisico && ventasEnTaquillaMarcadas < 2;
      if (ventaEnTaquilla) ventasEnTaquillaMarcadas += 1;
      // En la app, el pago en sitio solo se admite con 12 horas o más de antelación.
      const pagoEnSitioApp = fisico && !ventaEnTaquilla;

      // --- Fecha de creación: siempre en el pasado y coherente con el estado.
      let creada = new Date(
        salida.departsAt.getTime() - entero(1, 10) * DIA - entero(0, 86_400) * 1000,
      );
      const techo = pagoEnSitioApp
        ? minFecha(masMinutos(ahora, -30), masMinutos(salida.departsAt, -13 * 60))
        : masMinutos(ahora, -30);
      if (creada > techo) creada = masMinutos(techo, -entero(0, 72 * 60));
      if (status === "PENDIENTE_PAGO") {
        // Sigue sin pago, así que su plazo de 2 horas todavía no vence.
        creada = masMinutos(ahora, -entero(5, 110));
      } else if (status === "EN_VALIDACION") {
        // El comprobante llegó dentro del plazo y aún espera revisión.
        creada = masMinutos(ahora, -entero(20, 12 * 60));
      } else if (status === "LIBERADA" && !fisico && creada > masMinutos(ahora, -150)) {
        creada = masMinutos(ahora, -entero(150, 72 * 60));
      }

      const cuenta = cuentaPara(creada);

      // --- Pagos: el comprobante llega dentro de las 2 horas de la reserva, y
      // el pago en sitio se cobra antes de que falten 12 horas para la salida.
      const limitePago = salida.pasada
        ? masMinutos(salida.departsAt, -40)
        : masMinutos(ahora, -1);
      let envioComprobante: Date | null = null;
      let momentoPago: Date | null = null;
      if (CON_PAGO.has(status)) {
        if (ventaEnTaquilla) {
          momentoPago = creada;
        } else if (fisico) {
          momentoPago = entre(masMinutos(creada, 10), minFecha(limitePago, corte12));
        } else {
          envioComprobante = entre(
            masMinutos(creada, 5),
            minFecha(masMinutos(creada, 115), masMinutos(limitePago, -10)),
          );
          momentoPago = entre(
            masMinutos(envioComprobante, 5),
            minFecha(masMinutos(envioComprobante, 12 * 60), limitePago),
          );
        }
      }
      const pagoCompleto = PAGO_COMPLETO.has(status);
      const paidUsd = pagoCompleto
        ? m.totalUsd
        : momentoPago
          ? redondear(m.totalUsd.mul(entero(25, 70)).div(100))
          : dec(0);
      const paidAt = pagoCompleto ? momentoPago : null;

      const boardedAt =
        status === "ABORDADA" ? masMinutos(salida.departsAt, -entero(5, 35)) : null;
      if (status === "ABORDADA") abordados += pax;
      const cancelledAt = status === "CANCELADA" ? (salida.partida ?? salida.departsAt) : null;
      const liberadaAt =
        status !== "LIBERADA"
          ? null
          : minFecha(
              fisico ? masMinutos(corte12, entero(0, 5)) : masMinutos(creada, 120 + entero(0, 5)),
              masMinutos(ahora, -1),
            );
      const comprobantePendienteAt =
        status === "EN_VALIDACION"
          ? entre(
              masMinutos(creada, 5),
              minFecha(masMinutos(creada, 115), masMinutos(ahora, -2)),
            )
          : null;
      const actualizada = [
        creada,
        momentoPago,
        boardedAt,
        cancelledAt,
        liberadaAt,
        comprobantePendienteAt,
        status === "NO_SHOW" ? salida.partida : null,
      ]
        .filter((f): f is Date => f !== null)
        .reduce((a, b) => maxFecha(a, b));

      reservas.push({
        id: reservationId,
        code,
        publicToken: randomUUID(),
        accountId: cuenta.id,
        departureId: salida.id,
        paymentMethodId: metodo.id,
        status,
        salesChannel: ventaEnTaquilla ? "TAQUILLA" : "APP",
        soldByPanelUserId: ventaEnTaquilla ? operador : null,
        passengerCount: pax,
        policiesAcceptedAt: creada,
        fareUsd: salida.fareUsd,
        fareTotalUsd: m.fareTotalUsd,
        taxPerPassengerUsd: tasaSalida.amountUsd,
        taxTotalUsd: m.taxTotalUsd,
        totalUsd: m.totalUsd,
        paidUsd,
        currency: metodo.currency,
        exchangeRateUsed: m.exchangeRateUsed,
        amountInCurrency: m.amountInCurrency,
        // El plazo de 2 horas se conserva en las que siguen sin pago o se liberaron por él.
        expiresAt:
          status === "PENDIENTE_PAGO" || (status === "LIBERADA" && !fisico)
            ? masMinutos(creada, 120)
            : null,
        paidAt,
        // En el MVP ningún flujo marca la reconfirmación: el puesto se conserva pagando.
        reconfirmedAt: null,
        boardedAt,
        cancelledAt,
        cancellationReason:
          status === "CANCELADA"
            ? "No abordó y no completó el pago"
            : status === "LIBERADA"
              ? fisico
                ? "No reconfirmó el pago en sitio dentro del plazo"
                : "No se registró ningún pago dentro del plazo"
              : null,
        createdAt: creada,
        updatedAt: actualizada,
      });

      // Titular más acompañantes.
      pasajeros.push({
        id: randomUUID(),
        reservationId,
        fullName: cuenta.fullName,
        idNumber: cuenta.idNumber,
        birthYear: cuenta.birthYear,
        isHolder: true,
        boardedAt,
        boardedByPanelUserId: boardedAt ? operador : null,
        createdAt: creada,
      });
      for (let i = 1; i < pax; i += 1) {
        pasajeros.push({
          id: randomUUID(),
          reservationId,
          fullName: nombreCompleto().fullName,
          idNumber: cedulaUnica(cedulasUsadas),
          birthYear: entero(1955, ANIO_NACIMIENTO_MAX),
          isHolder: false,
          boardedAt,
          boardedByPanelUserId: boardedAt ? operador : null,
          createdAt: creada,
        });
      }

      // Un solo registro por pago: cobro en taquilla o comprobante aprobado.
      if (momentoPago && fisico) {
        efectivo.push({
          id: randomUUID(),
          reservationId,
          amount: redondear(paidUsd.mul(m.exchangeRateUsed)),
          currency: metodo.currency,
          amountUsd: paidUsd,
          collectedByPanelUserId: operador,
          collectedAt: momentoPago,
          createdAt: momentoPago,
        });
      } else if (momentoPago && envioComprobante) {
        comprobantes.push({
          id: randomUUID(),
          reservationId,
          paymentMethodId: metodo.id,
          reference: `REF-${entero(100000, 999999)}`,
          imagePath: `comprobantes/${cuenta.id}/${randomUUID()}.png`,
          amount: redondear(paidUsd.mul(m.exchangeRateUsed)),
          currency: metodo.currency,
          amountUsd: paidUsd,
          status: "APROBADO",
          reviewedByPanelUserId: operador,
          reviewedAt: momentoPago,
          createdAt: envioComprobante,
        });
      }

      // Cola de revisión del operador: comprobantes todavía sin validar.
      if (comprobantePendienteAt) {
        const parcial = suerte(0.4);
        const montoUsd = parcial
          ? redondear(m.totalUsd.mul(entero(30, 70)).div(100))
          : m.totalUsd;
        comprobantes.push({
          id: randomUUID(),
          reservationId,
          paymentMethodId: metodo.id,
          reference: `REF-${entero(100000, 999999)}`,
          imagePath: `comprobantes/${cuenta.id}/${randomUUID()}.png`,
          amount: redondear(montoUsd.mul(m.exchangeRateUsed)),
          currency: metodo.currency,
          amountUsd: montoUsd,
          status: "PENDIENTE",
          createdAt: comprobantePendienteAt,
        });
      }

      // Ticket emitido para toda reserva saldada.
      if (pagoCompleto && paidAt) {
        tickets.push({
          id: randomUUID(),
          reservationId,
          pdfPath: `tickets/${reservationId}/${code}.pdf`,
          qrPayload: `${code}.MOCKMOCKMOCKMOCK`,
          issuedAt: paidAt,
          sentAt: paidAt,
        });
      }

      // --- Mensajes: los mismos que envían los flujos y barridos reales, en
      // el orden en que ocurren y nunca con fecha posterior a ahora.
      const avisar = (templateKey: string, payload: Record<string, string>, momento: Date): void => {
        const enviado = minFecha(momento, ahora);
        mensajes.push({
          id: randomUUID(),
          reservationId,
          phone: cuenta.phone,
          templateKey,
          payload: { nombre: cuenta.fullName, serial: code, ...payload },
          status: estadoMensaje,
          providerMessageId: `mock-${randomUUID()}`,
          attempts: 1,
          scheduledFor: enviado,
          sentAt: enviado,
          createdAt: enviado,
        });
      };

      // Al reservar en la app (la venta en taquilla no envía este aviso).
      if (!ventaEnTaquilla) {
        if (fisico) {
          avisar(
            "reserva_condicional",
            { monto: formatMoney(m.amountInCurrency, metodo.currency), salida: salidaTexto },
            creada,
          );
        } else {
          avisar("solicitud_recibida", { pasajeros: String(pax) }, creada);
        }
      }
      // Abono aprobado que no completa el total.
      if (momentoPago && !pagoCompleto) {
        avisar(
          "abono_registrado",
          {
            abonado: formatMoney(paidUsd, "USD"),
            saldo: formatMoney(m.totalUsd.sub(paidUsd), "USD"),
          },
          momentoPago,
        );
      }
      if (pagoCompleto && paidAt) {
        avisar("ticket_emitido", { salida: salidaTexto, punto: salida.meetingPoint }, paidAt);
      }
      // Barrido de 24 horas: recordatorio a las pagadas o abonadas y pedido de
      // pago a las de pago en sitio. Corre entre las 24 y las 12 horas previas.
      const inicio24 = masMinutos(salida.departsAt, -24 * 60);
      const momento24 = fisico
        ? maxFecha(inicio24, creada)
        : momentoPago
          ? maxFecha(inicio24, momentoPago)
          : null;
      if (momento24 && momento24 <= minFecha(ahora, corte12)) {
        const enviado = masMinutos(momento24, entero(0, 5));
        const recordatorio = {
          salida: salidaTexto,
          punto: salida.meetingPoint,
          recomendaciones: salida.recomendaciones,
        };
        const yaPagada = momentoPago !== null && momentoPago <= momento24;
        if (!fisico || yaPagada) {
          avisar("recordatorio_24h", recordatorio, enviado);
        } else {
          avisar(
            "reconfirmacion_pago_sitio",
            { salida: salidaTexto, monto: formatMoney(m.amountInCurrency, metodo.currency) },
            enviado,
          );
          // Si paga en la taquilla dentro de la ventana, el barrido siguiente
          // ya la ve pagada y le manda también el recordatorio.
          if (momentoPago) {
            avisar("recordatorio_24h", recordatorio, masMinutos(momentoPago, entero(1, 5)));
          }
        }
      }
      // Confirmación de asistencia dos horas antes, a las ya pagadas.
      const momento2h = masMinutos(salida.departsAt, -2 * 60);
      if (paidAt && paidAt <= momento2h && momento2h <= ahora) {
        avisar("confirmacion_2h", {}, masMinutos(momento2h, entero(0, 5)));
      }
      if (liberadaAt) {
        avisar("reserva_liberada", {}, liberadaAt);
      }

      bitacora.push({
        id: randomUUID(),
        actorType: ventaEnTaquilla ? "PANEL" : "PASAJERO",
        actorPanelUserId: ventaEnTaquilla ? operador : null,
        actorAccountId: ventaEnTaquilla ? null : cuenta.id,
        entityType: "Reservation",
        entityId: reservationId,
        action: "RESERVA_CREADA",
        before: {},
        after: {
          code,
          passengerCount: pax,
          totalUsd: m.totalUsd.toString(),
          status: fisico ? "PAGO_EN_SITIO" : "PENDIENTE_PAGO",
          ...(ventaEnTaquilla ? { channel: "TAQUILLA" } : {}),
        },
        createdAt: creada,
      });
    }

    // Registro de movimiento del chofer para las salidas ya cumplidas.
    if (salida.pasada && salida.partida && salida.llegada) {
      const inicioEmbarque = masMinutos(salida.departsAt, -entero(35, 55));
      viajes.push({
        id: randomUUID(),
        departureId: salida.id,
        driverId: salida.driverId,
        vehicleId: salida.vehicleId,
        boardingStartedAt: inicioEmbarque,
        departedAt: salida.partida,
        arrivedAt: salida.llegada,
        passengerCount: abordados,
        createdAt: inicioEmbarque,
      });
    }

    // Lista de espera en las salidas próximas que quedaron llenas.
    if (!salida.pasada && ocupados >= salida.capacity - 1 && suerte(0.6)) {
      for (let i = 0; i < entero(1, 4); i += 1) {
        espera.push({
          id: randomUUID(),
          departureId: salida.id,
          accountId: elegir(cuentasQueReservan).id,
          passengerCount: tamanoGrupo(),
          status: "EN_ESPERA",
          createdAt: new Date(ahora.getTime() - entero(30, 4000) * MIN),
        });
      }
    }
  }

  // --- Reservas visibles para las cuentas documentadas --------------------
  // Sin esto las cuentas del README quedarían sin reservas y el recorrido de
  // prueba del sistema no tendría nada que mostrar. Se les pasa una reserva
  // por estado, de salidas y días distintos, y todo lo que cuelga de ella
  // (titular, mensajes, bitácora y comprobantes) queda a su nombre.
  const salidaPorId = new Map(todas.map((s) => [s.id, s]));
  const titularPorReserva = new Map<string, Prisma.PassengerCreateManyInput>();
  for (const pasajero of pasajeros) {
    if (pasajero.isHolder) titularPorReserva.set(pasajero.reservationId, pasajero);
  }
  function agrupar<T>(filas: T[], clave: (fila: T) => string | null | undefined): Map<string, T[]> {
    const mapa = new Map<string, T[]>();
    for (const fila of filas) {
      const id = clave(fila);
      if (!id) continue;
      const lista = mapa.get(id) ?? [];
      lista.push(fila);
      mapa.set(id, lista);
    }
    return mapa;
  }
  const mensajesPorReserva = agrupar(mensajes, (f) => f.reservationId);
  const comprobantesPorReserva = agrupar(comprobantes, (f) => f.reservationId);
  const bitacoraPorReserva = agrupar(bitacora, (f) =>
    f.entityType === "Reservation" ? f.entityId : null,
  );

  const yaAsignadas = new Set<string>();
  const ESTADOS_DE_SALIDAS_PASADAS = new Set<ReservationStatus>(["ABORDADA", "NO_SHOW"]);

  function reasignar(cuenta: (typeof cuentas)[number], estados: ReservationStatus[]): void {
    const salidasUsadas = new Set<string>();
    const diasUsados = new Set<string>();
    const diaDe = (reserva: Prisma.ReservationCreateManyInput) =>
      diaCaracas(salidaPorId.get(reserva.departureId)!.departsAt);

    for (const estado of estados) {
      const pasada = ESTADOS_DE_SALIDAS_PASADAS.has(estado);
      const aptas = reservas.filter(
        (r) =>
          r.status === estado &&
          r.passengerCount === 1 &&
          r.salesChannel === "APP" &&
          !yaAsignadas.has(r.id as string) &&
          salidaPorId.get(r.departureId)?.pasada === pasada,
      );
      // Primero una salida y un día nuevos; si no hay, al menos otra salida.
      const grupo = [
        aptas.filter((r) => !salidasUsadas.has(r.departureId) && !diasUsados.has(diaDe(r))),
        aptas.filter((r) => !salidasUsadas.has(r.departureId)),
        aptas,
      ].find((lista) => lista.length > 0);
      if (!grupo) continue;

      const candidata = elegir(grupo);
      const id = candidata.id as string;
      yaAsignadas.add(id);
      salidasUsadas.add(candidata.departureId);
      diasUsados.add(diaDe(candidata));
      const anterior = candidata.accountId;
      candidata.accountId = cuenta.id;

      const titular = titularPorReserva.get(id);
      if (titular) {
        titular.fullName = cuenta.fullName;
        titular.idNumber = cuenta.idNumber;
        titular.birthYear = cuenta.birthYear;
      }
      for (const mensaje of mensajesPorReserva.get(id) ?? []) {
        mensaje.phone = cuenta.phone;
        mensaje.payload = {
          ...(mensaje.payload as Record<string, string>),
          nombre: cuenta.fullName,
        };
      }
      for (const entrada of bitacoraPorReserva.get(id) ?? []) {
        if (entrada.actorAccountId === anterior) entrada.actorAccountId = cuenta.id;
      }
      for (const comprobante of comprobantesPorReserva.get(id) ?? []) {
        comprobante.imagePath = `comprobantes/${cuenta.id}/${path.posix.basename(comprobante.imagePath)}`;
      }
    }
  }

  const estadosDemo: ReservationStatus[] = [
    "PAGADA",
    "ABONADA",
    "EN_VALIDACION",
    "PENDIENTE_PAGO",
    "PAGO_EN_SITIO",
    "ABORDADA",
    "ABORDADA",
  ];
  for (const cuenta of cuentasFijas) {
    reasignar(cuenta, estadosDemo);
  }

  verificarCoherencia({
    ahora,
    cuentas,
    metodos,
    reservas,
    mensajes,
    comprobantes,
    efectivo,
    tickets,
    viajes,
    programadas: todas
      .filter((salida) => !salida.pasada)
      .map((salida) => ocupacionProgramada(salida)),
    bitacora,
  });


  async function insertar<T>(
    nombre: string,
    filas: T[],
    fn: (lote: T[]) => Promise<unknown>,
  ): Promise<void> {
    for (let i = 0; i < filas.length; i += 500) {
      await fn(filas.slice(i, i + 500));
    }
    process.stdout.write(`  ${nombre}: ${filas.length}\n`);
  }

  await insertar("Reservas", reservas, (l) =>
    prisma.reservation.createMany({ data: l, skipDuplicates: true }),
  );
  await insertar("Pasajeros", pasajeros, (l) =>
    prisma.passenger.createMany({ data: l, skipDuplicates: true }),
  );
  await insertar("Comprobantes", comprobantes, (l) =>
    prisma.paymentProof.createMany({ data: l, skipDuplicates: true }),
  );
  await insertar("Cobros en efectivo", efectivo, (l) =>
    prisma.cashPayment.createMany({ data: l, skipDuplicates: true }),
  );
  await insertar("Tickets", tickets, (l) =>
    prisma.ticket.createMany({ data: l, skipDuplicates: true }),
  );
  await insertar("Recorridos", viajes, (l) =>
    prisma.tripLog.createMany({ data: l, skipDuplicates: true }),
  );
  await insertar("Lista de espera", espera, (l) =>
    prisma.waitlistEntry.createMany({ data: l, skipDuplicates: true }),
  );
  await insertar("Mensajes", mensajes, (l) =>
    prisma.outboundMessage.createMany({ data: l, skipDuplicates: true }),
  );
  await insertar("Bitácora", bitacora, (l) =>
    prisma.auditLog.createMany({ data: l, skipDuplicates: true }),
  );

  process.stdout.write("Escribiendo imágenes de demostración...\n");
  await escribirImagenes(IMAGEN_CEDULA, documentos.map((d) => d.filePath));
  await escribirImagenes(IMAGEN_COMPROBANTE, comprobantes.map((c) => c.imagePath));

  // --- Resumen ------------------------------------------------------------
  const desde = new Date(ahora.getTime() - 24 * 3_600_000);
  const [totalCuentas, totalReservas, pendientes, recorridos, pagadas24h] = await Promise.all([
    prisma.passengerAccount.count(),
    prisma.reservation.count(),
    prisma.paymentProof.count({ where: { status: "PENDIENTE" } }),
    prisma.tripLog.count({ where: { arrivedAt: { not: null } } }),
    prisma.reservation.findMany({
      where: { paidAt: { gte: desde } },
      select: { taxTotalUsd: true },
    }),
  ]);
  const tasa24h = pagadas24h.reduce((acc, r) => redondear(acc.add(r.taxTotalUsd)), dec(0));

  process.stdout.write(
    [
      "",
      "  Datos de operación cargados",
      "  ─────────────────────────────────────────────",
      `  Cuentas de pasajero          ${totalCuentas}`,
      `  Reservas                     ${totalReservas}`,
      `  Comprobantes por revisar     ${pendientes}`,
      `  Recorridos completados       ${recorridos}`,
      `  Tasa de salida últimas 24 h  $ ${tasa24h.toFixed(2)}`,
      "",
      "  Acceso de pasajeros en /ingresar:",
      ...PASAJEROS_FIJOS.map(
        (p) => `    Cédula ${p.idNumber}   Pasajero.2026   (${p.fullName})`,
      ),
      "",
      "  Las demás cuentas generadas usan la misma contraseña Pasajero.2026.",
      "",
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    process.stderr.write(`Falló la carga: ${error instanceof Error ? error.stack : error}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
