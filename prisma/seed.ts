import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const ADMIN = { email: "admin@ticketruta.test", password: "Admin.2026", name: "Dirección del Terminal" };
const OPERADORES = [
  { email: "andes@ticketruta.test", password: "Operador.2026", name: "Taquilla Los Andes" },
  { email: "caribe@ticketruta.test", password: "Operador.2026", name: "Taquilla Caribe" },
];
const PASAJEROS = [
  {
    idNumber: "V12345678",
    password: "Pasajero.2026",
    givenNames: "Ana",
    surnames: "Pérez Rivas",
    fullName: "Ana Pérez Rivas",
    phone: "+584121112233",
    birthYear: 1993,
  },
  {
    idNumber: "V87654321",
    password: "Pasajero.2026",
    givenNames: "Luis",
    surnames: "Gómez Salas",
    fullName: "Luis Gómez Salas",
    phone: "+584141112233",
    birthYear: 1986,
  },
];

/** Fecha a una hora concreta de Caracas (UTC-4) dentro de los próximos días. */
function salidaEnDias(dias: number, horaCaracas: number): Date {
  const base = new Date();
  base.setUTCHours(0, 0, 0, 0);
  base.setUTCDate(base.getUTCDate() + dias);
  // Caracas es UTC-4, así que las HH locales son HH+4 en UTC.
  base.setUTCHours(horaCaracas + 4, 0, 0, 0);
  return base;
}

async function main(): Promise<void> {
  const existentes = await prisma.agency.count();
  if (existentes > 0) {
    process.stdout.write(
      "La base ya tiene agencias cargadas. El seed no duplica datos; no se hizo nada.\n",
    );
    return;
  }

  // --- Configuración del terminal ---
  const ayer = new Date(Date.now() - 24 * 3_600_000);
  await prisma.departureTax.create({ data: { amountUsd: "2.50", effectiveFrom: ayer } });
  await prisma.exchangeRate.createMany({
    data: [
      { currency: "VES", rateFromUsd: "36.741200", effectiveFrom: ayer },
      { currency: "COP", rateFromUsd: "4012.500000", effectiveFrom: ayer },
    ],
  });

  const adminHash = await argon2.hash(ADMIN.password, { type: argon2.argon2id });
  await prisma.panelUser.create({
    data: { email: ADMIN.email, passwordHash: adminHash, name: ADMIN.name, role: "ADMIN" },
  });

  // --- Métodos de pago del terminal ---
  await prisma.paymentMethod.createMany({
    data: [
      {
        name: "Zelle",
        kind: "DIGITAL",
        currency: "USD",
        details: { titular: "Terminal TicketRuta C.A.", correo: "pagos@ticketruta.test" },
        sortOrder: 1,
      },
      {
        name: "Pago Móvil",
        kind: "DIGITAL",
        currency: "VES",
        details: { banco: "0102 Banco de Venezuela", rif: "J-408112233", telefono: "0412-1112233" },
        sortOrder: 2,
      },
      {
        name: "Binance USDT",
        kind: "DIGITAL",
        currency: "USDT",
        details: { red: "TRC20", wallet: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" },
        sortOrder: 3,
      },
      {
        name: "Nequi",
        kind: "DIGITAL",
        currency: "COP",
        details: { titular: "TicketRuta SAS", telefono: "300 111 2233" },
        sortOrder: 4,
      },
      {
        name: "Efectivo en taquilla (divisas)",
        kind: "FISICO",
        currency: "USD",
        details: { nota: "Paga en la taquilla del terminal antes de abordar." },
        sortOrder: 5,
      },
      {
        name: "Bolívares en efectivo",
        kind: "FISICO",
        currency: "VES",
        details: { nota: "Paga en la taquilla del terminal antes de abordar." },
        sortOrder: 6,
      },
    ],
  });

  // --- Agencias con su flota y rutas ---
  const definiciones = [
    {
      agencia: {
        name: "Expresos Los Andes",
        taxId: "J-301234567",
        contactPhone: "+582127778899",
        contactEmail: "contacto@losandes.test",
      },
      operador: OPERADORES[0]!,
      vehiculos: [
        { plate: "AB123CD", brand: "Mercedes-Benz", model: "O500 RS", seatCount: 44 },
        { plate: "AC456EF", brand: "Scania", model: "K360", seatCount: 40 },
        { plate: "AD789GH", brand: "Volvo", model: "9800", seatCount: 36 },
      ],
      choferes: [
        { fullName: "Jesús Antonio Mora", idNumber: "V10111222", phone: "+584161112233" },
        { fullName: "Carmen Elena Duque", idNumber: "V13444555", phone: "+584161112244" },
        { fullName: "Rafael Ignacio Pino", idNumber: "V09888777", phone: "+584161112255" },
      ],
      rutas: [
        {
          name: "Caracas – San Cristóbal",
          origin: "Caracas",
          destination: "San Cristóbal",
          fareUsd: "45.00",
          meetingPoint: "Terminal La Bandera, andén 12",
          estimatedMinutes: 840,
          travelTips: "Lleva abrigo, el trayecto cruza el páramo de noche.",
          horas: [19, 20, 21],
        },
        {
          name: "Caracas – Mérida",
          origin: "Caracas",
          destination: "Mérida",
          fareUsd: "40.00",
          meetingPoint: "Terminal La Bandera, andén 8",
          estimatedMinutes: 720,
          travelTips: "Llega 45 minutos antes con tu cédula en mano.",
          horas: [18, 22],
        },
        {
          name: "Caracas – Barinas",
          origin: "Caracas",
          destination: "Barinas",
          fareUsd: "30.00",
          meetingPoint: "Terminal La Bandera, andén 5",
          estimatedMinutes: 540,
          travelTips: "Equipaje de mano hasta 10 kg sin costo.",
          horas: [7],
        },
      ],
    },
    {
      agencia: {
        name: "Transporte Caribe",
        taxId: "J-405556667",
        contactPhone: "+582812223344",
        contactEmail: "contacto@caribe.test",
      },
      operador: OPERADORES[1]!,
      vehiculos: [
        { plate: "BA321DC", brand: "Yutong", model: "ZK6122", seatCount: 48 },
        { plate: "BB654FE", brand: "Marcopolo", model: "Paradiso 1200", seatCount: 42 },
      ],
      choferes: [
        { fullName: "Pedro José Marcano", idNumber: "V14222333", phone: "+584241112233" },
        { fullName: "Yubisay Coromoto Ríos", idNumber: "V16333444", phone: "+584241112244" },
      ],
      rutas: [
        {
          name: "Caracas – Puerto La Cruz",
          origin: "Caracas",
          destination: "Puerto La Cruz",
          fareUsd: "25.00",
          meetingPoint: "Terminal La Bandera, andén 2",
          estimatedMinutes: 330,
          travelTips: "Salida puntual, no se espera a pasajeros retrasados.",
          horas: [6, 14],
        },
        {
          name: "Caracas – Cumaná",
          origin: "Caracas",
          destination: "Cumaná",
          fareUsd: "28.00",
          meetingPoint: "Terminal La Bandera, andén 3",
          estimatedMinutes: 420,
          travelTips: "Lleva agua para el trayecto.",
          horas: [8],
        },
      ],
    },
  ];

  for (const definicion of definiciones) {
    const agencia = await prisma.agency.create({ data: definicion.agencia });

    const hash = await argon2.hash(definicion.operador.password, { type: argon2.argon2id });
    await prisma.panelUser.create({
      data: {
        email: definicion.operador.email,
        passwordHash: hash,
        name: definicion.operador.name,
        role: "OPERADOR",
        agencyId: agencia.id,
      },
    });

    const vehiculos = [];
    for (const vehiculo of definicion.vehiculos) {
      vehiculos.push(
        await prisma.vehicle.create({ data: { ...vehiculo, agencyId: agencia.id } }),
      );
    }
    const choferes = [];
    for (const chofer of definicion.choferes) {
      choferes.push(await prisma.driver.create({ data: { ...chofer, agencyId: agencia.id } }));
    }

    let indiceUnidad = 0;
    for (const rutaDef of definicion.rutas) {
      const { horas, ...datosRuta } = rutaDef;
      const ruta = await prisma.route.create({
        data: { ...datosRuta, agencyId: agencia.id },
      });

      for (let dia = 1; dia <= 7; dia += 1) {
        for (const hora of horas) {
          const vehiculo = vehiculos[indiceUnidad % vehiculos.length]!;
          const chofer = choferes[indiceUnidad % choferes.length]!;
          indiceUnidad += 1;
          const departsAt = salidaEnDias(dia, hora);

          // Un mismo vehículo no puede tener dos salidas a la misma hora.
          const ocupado = await prisma.departure.findFirst({
            where: { vehicleId: vehiculo.id, departsAt },
          });
          if (ocupado) continue;

          await prisma.departure.create({
            data: {
              routeId: ruta.id,
              vehicleId: vehiculo.id,
              driverId: chofer.id,
              departsAt,
              capacity: vehiculo.seatCount,
            },
          });
        }
      }
    }
  }

  // --- Cuentas de pasajero de prueba ---
  for (const pasajero of PASAJEROS) {
    const hash = await argon2.hash(pasajero.password, { type: argon2.argon2id });
    await prisma.passengerAccount.create({
      data: {
        idNumber: pasajero.idNumber,
        givenNames: pasajero.givenNames,
        surnames: pasajero.surnames,
        fullName: pasajero.fullName,
        phone: pasajero.phone,
        birthYear: pasajero.birthYear,
        passwordHash: hash,
      },
    });
  }

  const salidas = await prisma.departure.count();

  process.stdout.write(
    [
      "",
      "  TicketRuta — datos de demostración cargados",
      "  ─────────────────────────────────────────────────────────",
      `  Salidas programadas: ${salidas} en los próximos 7 días`,
      "",
      "  Acceso del personal      http://localhost:3000/panel/ingresar",
      `    Admin del terminal     ${ADMIN.email} / ${ADMIN.password}`,
      `    Operador Los Andes     ${OPERADORES[0]!.email} / ${OPERADORES[0]!.password}`,
      `    Operador Caribe        ${OPERADORES[1]!.email} / ${OPERADORES[1]!.password}`,
      "",
      "  Acceso de pasajeros      http://localhost:3000/ingresar",
      `    Cédula ${PASAJEROS[0]!.idNumber}        ${PASAJEROS[0]!.password}`,
      `    Cédula ${PASAJEROS[1]!.idNumber}        ${PASAJEROS[1]!.password}`,
      "",
      "  Tasa de salida vigente: $ 2,50 por pasajero",
      "  Tasas de cambio: 1 USD = 36,7412 Bs = 4.012,50 COP",
      "",
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    process.stderr.write(`El seed falló: ${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
