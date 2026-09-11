import { randomUUID } from "node:crypto";
import type { Currency, DocumentType, PaymentKind, PanelRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/modules/auth";

const ayer = () => new Date(Date.now() - 24 * 3_600_000);

/** Tasa de salida y tasas de cambio que usan casi todos los tests. */
export async function seedRatesFixture(): Promise<void> {
  await prisma.departureTax.create({ data: { amountUsd: "2.50", effectiveFrom: ayer() } });
  await prisma.exchangeRate.createMany({
    data: [
      { currency: "VES", rateFromUsd: "36.741200", effectiveFrom: ayer() },
      { currency: "COP", rateFromUsd: "4012.500000", effectiveFrom: ayer() },
    ],
  });
}

export async function createAgencyFixture(overrides: { name?: string } = {}) {
  const sufijo = randomUUID().slice(0, 8);
  return prisma.agency.create({
    data: {
      name: overrides.name ?? `Agencia ${sufijo}`,
      taxId: `J-${sufijo}`,
      contactPhone: "+582120000000",
      contactEmail: `contacto-${sufijo}@test.local`,
    },
  });
}

export async function createPanelUserFixture(input: {
  agencyId?: string | null;
  role?: PanelRole;
  password?: string;
}) {
  const sufijo = randomUUID().slice(0, 8);
  return prisma.panelUser.create({
    data: {
      email: `panel-${sufijo}@test.local`,
      passwordHash: await hashPassword(input.password ?? "Clave.2026"),
      name: `Usuario ${sufijo}`,
      role: input.role ?? "OPERADOR",
      agencyId: input.agencyId ?? null,
    },
  });
}

export async function createVehicleFixture(agencyId: string, seatCount = 40) {
  const sufijo = randomUUID().slice(0, 6).toUpperCase();
  return prisma.vehicle.create({
    data: { agencyId, plate: `AA${sufijo}`, brand: "Marca", model: "Modelo", seatCount },
  });
}

export async function createDriverFixture(agencyId: string) {
  const sufijo = randomUUID().slice(0, 6);
  return prisma.driver.create({
    data: {
      agencyId,
      fullName: `Chofer ${sufijo}`,
      idNumber: `V${Math.floor(10_000_000 + Math.random() * 89_999_999)}`,
      phone: "+584160000000",
    },
  });
}

export async function createRouteFixture(
  agencyId: string,
  overrides: { fareUsd?: string; name?: string } = {},
) {
  const sufijo = randomUUID().slice(0, 6);
  return prisma.route.create({
    data: {
      agencyId,
      name: overrides.name ?? `Ruta ${sufijo}`,
      origin: "Caracas",
      destination: `Destino ${sufijo}`,
      fareUsd: overrides.fareUsd ?? "45.00",
      meetingPoint: "Terminal La Bandera, andén 12",
      estimatedMinutes: 480,
      travelTips: "Llega 30 minutos antes.",
    },
  });
}

export interface DepartureFixtureOptions {
  capacity?: number;
  hoursFromNow?: number;
  routeId?: string;
  agencyId?: string;
}

/** Crea agencia, ruta, vehículo, chofer y salida en un solo paso. */
export async function createDepartureFixture(options: DepartureFixtureOptions = {}) {
  const agencia = options.agencyId
    ? await prisma.agency.findUniqueOrThrow({ where: { id: options.agencyId } })
    : await createAgencyFixture();
  const ruta = options.routeId
    ? await prisma.route.findUniqueOrThrow({ where: { id: options.routeId } })
    : await createRouteFixture(agencia.id);
  const capacity = options.capacity ?? 40;
  const vehiculo = await createVehicleFixture(agencia.id, Math.max(capacity, 40));
  const chofer = await createDriverFixture(agencia.id);

  const salida = await prisma.departure.create({
    data: {
      routeId: ruta.id,
      vehicleId: vehiculo.id,
      driverId: chofer.id,
      departsAt: new Date(Date.now() + (options.hoursFromNow ?? 72) * 3_600_000),
      capacity,
    },
  });

  return { agencia, ruta, vehiculo, chofer, salida };
}

export async function createPaymentMethodFixture(
  input: { kind?: PaymentKind; currency?: Currency; agencyId?: string | null } = {},
) {
  const sufijo = randomUUID().slice(0, 6);
  return prisma.paymentMethod.create({
    data: {
      agencyId: input.agencyId ?? null,
      name: `Método ${sufijo}`,
      kind: input.kind ?? "DIGITAL",
      currency: input.currency ?? "USD",
      details: { nota: "Datos de cobro de prueba" },
    },
  });
}

export interface AccountFixtureOptions {
  birthYear?: number;
  withCedula?: boolean;
  withPermiso?: boolean;
  givenNames?: string;
  surnames?: string;
}

/** Cuenta de pasajero, con su foto de cédula ya cargada salvo que se indique lo contrario. */
export async function createAccountFixture(options: AccountFixtureOptions = {}) {
  const sufijo = randomUUID().slice(0, 6);
  const givenNames = options.givenNames ?? "Pasajero";
  const surnames = options.surnames ?? `${sufijo} Prueba`;
  const cuenta = await prisma.passengerAccount.create({
    data: {
      idNumber: `V${Math.floor(10_000_000 + Math.random() * 89_999_999)}`,
      givenNames,
      surnames,
      fullName: `${givenNames} ${surnames}`,
      phone: "+584121110000",
      birthYear: options.birthYear ?? 1990,
      passwordHash: await hashPassword("Pasajero.2026"),
    },
  });

  const documentos: DocumentType[] = [];
  if (options.withCedula !== false) documentos.push("CEDULA");
  if (options.withPermiso) documentos.push("PERMISO_VIAJE");
  for (const tipo of documentos) {
    await prisma.passengerDocument.create({
      data: {
        accountId: cuenta.id,
        type: tipo,
        filePath: `documentos/${cuenta.id}/${tipo.toLowerCase()}.png`,
        originalName: `${tipo.toLowerCase()}.png`,
      },
    });
  }
  return cuenta;
}
