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
import { PrismaClient, Prisma } from "@prisma/client";
import type { Currency, PaymentMethod, ReservationStatus } from "@prisma/client";
import argon2 from "argon2";
import { formatMoney } from "@/lib/decimal";
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
    pasada: boolean;
  }

  const salidasNuevas: SalidaMock[] = [];
  let contadorUnidad = 0;

  for (const ruta of rutas) {
    // Se reutiliza el horario de la primera salida ya sembrada de esa ruta.
    const referencia = ruta.departures[0];
    if (!referencia) continue;
    const horaUtc = referencia.departsAt.getUTCHours();

    const vehiculos = vehiculosPorAgencia.get(ruta.agencyId) ?? [];
    const choferes = choferesPorAgencia.get(ruta.agencyId) ?? [];
    if (vehiculos.length === 0 || choferes.length === 0) continue;

    for (let dia = DIAS_PASADOS; dia >= 1; dia -= 1) {
      const departsAt = new Date(ahora);
      departsAt.setUTCDate(departsAt.getUTCDate() - dia);
      departsAt.setUTCHours(horaUtc, 0, 0, 0);
      if (departsAt >= ahora) continue;

      const vehiculo = vehiculos[contadorUnidad % vehiculos.length]!;
      const chofer = choferes[contadorUnidad % choferes.length]!;
      contadorUnidad += 1;

      salidasNuevas.push({
        id: randomUUID(),
        routeId: ruta.id,
        agencyId: ruta.agencyId,
        vehicleId: vehiculo.id,
        driverId: chofer.id,
        departsAt,
        capacity: vehiculo.seatCount,
        fareUsd: ruta.fareUsd,
        estimatedMinutes: ruta.estimatedMinutes,
        meetingPoint: ruta.meetingPoint,
        pasada: true,
      });
    }
  }

  // Se descartan choques de vehículo y hora, que la base no admite.
  const ocupacionVehiculo = new Set<string>();
  const salidasFiltradas = salidasNuevas.filter((s) => {
    const clave = `${s.vehicleId}|${s.departsAt.toISOString()}`;
    if (ocupacionVehiculo.has(clave)) return false;
    ocupacionVehiculo.add(clave);
    return true;
  });

  await prisma.departure.createMany({
    data: salidasFiltradas.map((s) => ({
      id: s.id,
      routeId: s.routeId,
      vehicleId: s.vehicleId,
      driverId: s.driverId,
      departsAt: s.departsAt,
      capacity: s.capacity,
      status: "FINALIZADA" as const,
      manifestClosedAt: new Date(s.departsAt.getTime() - 40 * 60_000),
    })),
  });

  // --- Salidas futuras ya sembradas --------------------------------------
  const futuras = await prisma.departure.findMany({
    where: { departsAt: { gte: ahora } },
    include: { route: true },
  });
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
      pasada: false,
    })),
  ];

  // --- Cuentas de pasajero ------------------------------------------------
  process.stdout.write(`Creando ${CUENTAS} cuentas de pasajero...\n`);

  // El hash de argon2 es deliberadamente lento; para datos de prueba se calcula
  // una sola vez y se reutiliza. Todas comparten la contraseña Pasajero.2026.
  const hashCompartido = await argon2.hash("Pasajero.2026", { type: argon2.argon2id });

  const cedulasUsadas = new Set<string>(PASAJEROS_FIJOS.map((p) => p.idNumber));

  const cuentasFijas = PASAJEROS_FIJOS.map((fijo) => {
    const registro = new Date(ahora.getTime() - 90 * 24 * 3_600_000);
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
      lastLoginAt: new Date(ahora.getTime() - entero(1, 48) * 3_600_000),
    };
  });

  const cuentasAleatorias = Array.from({ length: CUENTAS - cuentasFijas.length }, () => {
    const registro = new Date(
      ahora.getTime() - entero(0, ANTIGUEDAD_MAX_DIAS) * 24 * 3_600_000 - entero(0, 86_400) * 1000,
    );
    const nombre = nombreCompleto();
    return {
      id: randomUUID(),
      idNumber: cedulaUnica(cedulasUsadas),
      givenNames: nombre.givenNames,
      surnames: nombre.surnames,
      fullName: nombre.fullName,
      phone: telefono(),
      birthYear: entero(1955, 2012),
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

  for (const salida of todas) {
    const operador = operadoresPorAgencia.get(salida.agencyId);
    if (!operador) continue;

    // Ocupación típica: más llena en salidas pasadas que en las de dentro de días.
    const diasHasta = (salida.departsAt.getTime() - ahora.getTime()) / (24 * 3_600_000);
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

    while (ocupados < limite) {
      const pax = Math.min(tamanoGrupo(), limite - ocupados);
      if (pax < 1) break;
      ocupados += pax;

      const cuenta = elegir(cuentas);
      const usaEfectivo = suerte(0.35);
      const metodo = usaEfectivo ? elegir(fisicos) : elegir(digitales);
      const m = montos(salida.fareUsd, pax, metodo);
      const code = serialUnico(salida.departsAt, pax);
      const reservationId = randomUUID();
      const creada = new Date(
        salida.departsAt.getTime() - entero(1, 10) * 24 * 3_600_000 - entero(0, 86_400) * 1000,
      );

      let status: ReservationStatus;
      let paidUsd = dec(0);
      let paidAt: Date | null = null;
      let boardedAt: Date | null = null;

      if (salida.pasada) {
        // Un día ya cerrado: casi todos viajaron, algunos no se presentaron.
        const r = Math.random();
        if (r < 0.88) {
          status = "ABORDADA";
          paidUsd = m.totalUsd;
          paidAt = new Date(salida.departsAt.getTime() - entero(1, 72) * 3_600_000);
          boardedAt = new Date(salida.departsAt.getTime() - entero(5, 35) * 60_000);
          abordados += pax;
        } else if (r < 0.95) {
          status = "NO_SHOW";
          paidUsd = m.totalUsd;
          paidAt = new Date(salida.departsAt.getTime() - entero(1, 72) * 3_600_000);
        } else {
          status = "CANCELADA";
        }
      } else {
        const r = Math.random();
        if (r < 0.42) {
          status = "PAGADA";
          paidUsd = m.totalUsd;
          paidAt = new Date(creada.getTime() + entero(10, 600) * 60_000);
        } else if (r < 0.54) {
          status = "ABONADA";
          paidUsd = redondear(m.totalUsd.mul(entero(25, 70)).div(100));
        } else if (r < 0.66) {
          status = "EN_VALIDACION";
        } else if (r < 0.86) {
          status = usaEfectivo ? "PAGO_EN_SITIO" : "PENDIENTE_PAGO";
        } else if (r < 0.94) {
          status = "PENDIENTE_PAGO";
        } else {
          status = "LIBERADA";
        }
      }

      // La tasa de salida del terminal se cobra al momento de saldar la reserva.
      if (paidAt && paidAt > ahora) paidAt = new Date(ahora.getTime() - entero(1, 120) * 60_000);

      reservas.push({
        id: reservationId,
        code,
        publicToken: randomUUID(),
        accountId: cuenta.id,
        departureId: salida.id,
        paymentMethodId: metodo.id,
        status,
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
        expiresAt:
          status === "PENDIENTE_PAGO"
            ? new Date(creada.getTime() + 120 * 60_000)
            : null,
        paidAt,
        reconfirmedAt:
          status === "PAGO_EN_SITIO" && suerte(0.55)
            ? new Date(creada.getTime() + entero(60, 2000) * 60_000)
            : null,
        boardedAt,
        cancelledAt: status === "CANCELADA" ? new Date(salida.departsAt.getTime() - 3_600_000) : null,
        cancellationReason:
          status === "CANCELADA"
            ? "No abordó y no completó el pago"
            : status === "LIBERADA"
              ? "No se registró ningún pago dentro del plazo"
              : null,
        createdAt: creada,
        updatedAt: paidAt ?? creada,
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
          birthYear: entero(1955, 2014),
          isHolder: false,
          boardedAt,
          boardedByPanelUserId: boardedAt ? operador : null,
          createdAt: creada,
        });
      }

      // Pagos que respaldan el estado de la reserva.
      const conPago = paidUsd.greaterThan(0);
      if (conPago && metodo.kind === "FISICO") {
        efectivo.push({
          id: randomUUID(),
          reservationId,
          amount: redondear(paidUsd.mul(m.exchangeRateUsed)),
          currency: metodo.currency,
          amountUsd: paidUsd,
          collectedByPanelUserId: operador,
          collectedAt: paidAt ?? creada,
          createdAt: paidAt ?? creada,
        });
      } else if (conPago) {
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
          reviewedAt: paidAt ?? creada,
          createdAt: new Date((paidAt ?? creada).getTime() - entero(5, 240) * 60_000),
        });
      }

      // Cola de revisión del operador: comprobantes todavía sin validar.
      if (status === "EN_VALIDACION") {
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
          createdAt: new Date(ahora.getTime() - entero(5, 900) * 60_000),
        });
      }

      if (status === "ABONADA") {
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
          reviewedAt: new Date(creada.getTime() + entero(20, 900) * 60_000),
          createdAt: new Date(creada.getTime() + entero(5, 60) * 60_000),
        });
      }

      // Ticket emitido para toda reserva saldada.
      if (paidUsd.equals(m.totalUsd) && status !== "CANCELADA" && status !== "LIBERADA") {
        tickets.push({
          id: randomUUID(),
          reservationId,
          pdfPath: `tickets/${reservationId}/${code}.pdf`,
          qrPayload: `${code}.MOCKMOCKMOCKMOCK`,
          issuedAt: paidAt ?? creada,
          sentAt: paidAt ?? creada,
        });
        mensajes.push({
          id: randomUUID(),
          reservationId,
          phone: cuenta.phone,
          templateKey: "ticket_emitido",
          payload: {
            nombre: cuenta.fullName,
            serial: code,
            salida: formatCaracasDateTime24(salida.departsAt),
            punto: salida.meetingPoint,
          },
          status: "ENTREGADO",
          providerMessageId: `mock-${randomUUID()}`,
          attempts: 1,
          scheduledFor: paidAt ?? creada,
          sentAt: paidAt ?? creada,
          createdAt: paidAt ?? creada,
        });
      }

      mensajes.push({
        id: randomUUID(),
        reservationId,
        phone: cuenta.phone,
        templateKey: metodo.kind === "FISICO" ? "reserva_condicional" : "solicitud_recibida",
        payload:
          metodo.kind === "FISICO"
            ? {
                nombre: cuenta.fullName,
                serial: code,
                monto: formatMoney(m.amountInCurrency, metodo.currency),
                salida: formatCaracasDateTime24(salida.departsAt),
              }
            : { nombre: cuenta.fullName, pasajeros: String(pax), serial: code },
        status: salida.pasada ? "LEIDO" : "ENTREGADO",
        providerMessageId: `mock-${randomUUID()}`,
        attempts: 1,
        scheduledFor: creada,
        sentAt: creada,
        createdAt: creada,
      });

      bitacora.push({
        id: randomUUID(),
        actorType: "PASAJERO",
        actorAccountId: cuenta.id,
        entityType: "Reservation",
        entityId: reservationId,
        action: "RESERVA_CREADA",
        before: {},
        after: { code, passengerCount: pax, totalUsd: m.totalUsd.toString() },
        createdAt: creada,
      });
    }

    // Registro de movimiento del chofer para las salidas ya cumplidas.
    if (salida.pasada) {
      const partida = new Date(salida.departsAt.getTime() + entero(-5, 25) * 60_000);
      const desvio = entero(-12, 25) / 100;
      const duracion = Math.round(salida.estimatedMinutes * (1 + desvio));
      viajes.push({
        id: randomUUID(),
        departureId: salida.id,
        driverId: salida.driverId,
        vehicleId: salida.vehicleId,
        boardingStartedAt: new Date(salida.departsAt.getTime() - entero(35, 55) * 60_000),
        departedAt: partida,
        arrivedAt: new Date(partida.getTime() + duracion * 60_000),
        passengerCount: abordados,
        createdAt: new Date(salida.departsAt.getTime() - 3_600_000),
      });
    }

    // Lista de espera en las salidas próximas que quedaron llenas.
    if (!salida.pasada && ocupados >= salida.capacity - 1 && suerte(0.6)) {
      for (let i = 0; i < entero(1, 4); i += 1) {
        espera.push({
          id: randomUUID(),
          departureId: salida.id,
          accountId: elegir(cuentas).id,
          passengerCount: tamanoGrupo(),
          status: "EN_ESPERA",
          createdAt: new Date(ahora.getTime() - entero(30, 4000) * 60_000),
        });
      }
    }
  }

  // --- Reservas visibles para las cuentas documentadas --------------------
  // Sin esto las cuentas del README podrían quedar sin ninguna reserva y el
  // recorrido de prueba del sistema no tendría nada que mostrar.
  const salidasFuturas = new Set(todas.filter((s) => !s.pasada).map((s) => s.id));
  const titularPorReserva = new Map<string, Prisma.PassengerCreateManyInput>();
  for (const pasajero of pasajeros) {
    if (pasajero.isHolder) titularPorReserva.set(pasajero.reservationId, pasajero);
  }
  const mensajesPorReserva = new Map<string, Prisma.OutboundMessageCreateManyInput[]>();
  for (const mensaje of mensajes) {
    if (!mensaje.reservationId) continue;
    const lista = mensajesPorReserva.get(mensaje.reservationId) ?? [];
    lista.push(mensaje);
    mensajesPorReserva.set(mensaje.reservationId, lista);
  }

  const yaAsignadas = new Set<string>();

  function reasignar(cuenta: (typeof cuentas)[number], estados: ReservationStatus[]): void {
    for (const estado of estados) {
      const candidata = reservas.find(
        (r) =>
          r.status === estado &&
          salidasFuturas.has(r.departureId) &&
          !yaAsignadas.has(r.id as string) &&
          r.passengerCount === 1,
      );
      if (!candidata) continue;
      const id = candidata.id as string;
      yaAsignadas.add(id);
      candidata.accountId = cuenta.id;

      const titular = titularPorReserva.get(id);
      if (titular) {
        titular.fullName = cuenta.fullName;
        titular.idNumber = cuenta.idNumber;
        titular.birthYear = cuenta.birthYear;
      }
      for (const mensaje of mensajesPorReserva.get(id) ?? []) {
        mensaje.phone = cuenta.phone;
      }
    }
  }

  const estadosDemo: ReservationStatus[] = [
    "PAGADA",
    "ABONADA",
    "EN_VALIDACION",
    "PENDIENTE_PAGO",
    "PAGO_EN_SITIO",
  ];
  for (const cuenta of cuentasFijas) {
    reasignar(cuenta, estadosDemo);
  }

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
