import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createCounterAccount, loginAccount, registerAccount } from "@/modules/accounts";
import { ValidationError } from "@/modules/booking/errors";
import { createAgencyFixture, createPanelUserFixture, seedRatesFixture } from "../fixtures";
import { disconnect, resetDatabase } from "../setup";

beforeEach(async () => {
  await resetDatabase();
  await seedRatesFixture();
});
afterAll(disconnect);

describe("registerAccount", () => {
  it("guarda nombres, apellidos y el nombre completo compuesto", async () => {
    const { accountId } = await registerAccount({
      idNumber: "V12345678",
      givenNames: "María José",
      surnames: "Pérez  Rivas",
      phone: "0412-1112233",
      birthYear: 1990,
      password: "Pasajero.2026",
    });

    const cuenta = await prisma.passengerAccount.findUniqueOrThrow({
      where: { id: accountId },
    });
    expect(cuenta.givenNames).toBe("María José");
    expect(cuenta.surnames).toBe("Pérez Rivas");
    expect(cuenta.fullName).toBe("María José Pérez Rivas");
  });

  it("rechaza nombres vacíos o muy cortos", async () => {
    await expect(
      registerAccount({
        idNumber: "V87654321",
        givenNames: "A",
        surnames: "Pérez Rivas",
        phone: "0412-1112233",
        birthYear: 1990,
        password: "Pasajero.2026",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("rechaza apellidos vacíos o muy cortos", async () => {
    await expect(
      registerAccount({
        idNumber: "V87654322",
        givenNames: "María José",
        surnames: "B",
        phone: "0412-1112233",
        birthYear: 1990,
        password: "Pasajero.2026",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("guarda la auditoría CUENTA_CREADA con nombres, apellidos y nombre completo", async () => {
    const { accountId } = await registerAccount({
      idNumber: "V11223344",
      givenNames: "Luis",
      surnames: "Gómez Salas",
      phone: "0412-1112233",
      birthYear: 1990,
      password: "Pasajero.2026",
    });

    const registro = await prisma.auditLog.findFirstOrThrow({
      where: { entityId: accountId, action: "CUENTA_CREADA" },
    });
    expect(registro.after).toMatchObject({
      idNumber: "V11223344",
      givenNames: "Luis",
      surnames: "Gómez Salas",
      fullName: "Luis Gómez Salas",
    });
  });
});

describe("createCounterAccount y activación en /registro", () => {
  async function crearOperador() {
    const agencia = await createAgencyFixture();
    return createPanelUserFixture({ agencyId: agencia.id });
  }

  it("crea la cuenta sin contraseña y marca quién la creó, con su auditoría", async () => {
    const operador = await crearOperador();

    const { accountId } = await prisma.$transaction((tx) =>
      createCounterAccount(tx, {
        idNumber: "V20000001",
        givenNames: "Ana",
        surnames: "Torres Díaz",
        phone: "0412-111.22.33",
        birthYear: 1995,
        panelUserId: operador.id,
      }),
    );

    const cuenta = await prisma.passengerAccount.findUniqueOrThrow({ where: { id: accountId } });
    expect(cuenta.passwordHash).toBeNull();
    expect(cuenta.createdByPanelUserId).toBe(operador.id);
    expect(cuenta.fullName).toBe("Ana Torres Díaz");

    const registro = await prisma.auditLog.findFirstOrThrow({
      where: { entityId: accountId, action: "CUENTA_CREADA_EN_TAQUILLA" },
    });
    expect(registro.actorType).toBe("PANEL");
    expect(registro.actorPanelUserId).toBe(operador.id);
    expect(registro.after).toMatchObject({
      idNumber: "V20000001",
      givenNames: "Ana",
      surnames: "Torres Díaz",
      fullName: "Ana Torres Díaz",
    });
  });

  it("loginAccount de una cuenta de taquilla sin activar devuelve null", async () => {
    const operador = await crearOperador();
    await prisma.$transaction((tx) =>
      createCounterAccount(tx, {
        idNumber: "V20000002",
        givenNames: "Ana",
        surnames: "Torres Díaz",
        phone: "0412-1112233",
        birthYear: 1995,
        panelUserId: operador.id,
      }),
    );

    const resultado = await loginAccount("V20000002", "cualquier-cosa");
    expect(resultado).toBeNull();
  });

  it("registerAccount con la misma cédula, teléfono equivalente y mismo año activa la cuenta", async () => {
    const operador = await crearOperador();
    const { accountId } = await prisma.$transaction((tx) =>
      createCounterAccount(tx, {
        idNumber: "V20000003",
        givenNames: "Ana",
        surnames: "Torres Díaz",
        phone: "0412-111.22.33",
        birthYear: 1995,
        panelUserId: operador.id,
      }),
    );

    const activacion = await registerAccount({
      idNumber: "V20000003",
      givenNames: "Otro Nombre",
      surnames: "Otro Apellido",
      phone: "04121112233",
      birthYear: 1995,
      password: "Pasajero.2026",
    });
    expect(activacion.accountId).toBe(accountId);

    const cuenta = await prisma.passengerAccount.findUniqueOrThrow({ where: { id: accountId } });
    expect(cuenta.givenNames).toBe("Ana");
    expect(cuenta.surnames).toBe("Torres Díaz");
    expect(cuenta.passwordHash).not.toBeNull();

    const sesion = await loginAccount("V20000003", "Pasajero.2026");
    expect(sesion).not.toBeNull();
    expect(sesion?.accountId).toBe(accountId);

    const registro = await prisma.auditLog.findFirstOrThrow({
      where: { entityId: accountId, action: "CUENTA_ACTIVADA" },
    });
    expect(registro.actorType).toBe("PASAJERO");
    expect(registro.actorAccountId).toBe(accountId);
    expect(registro.after).toMatchObject({ idNumber: "V20000003" });
  });

  it("registerAccount con un teléfono distinto no activa la cuenta de taquilla", async () => {
    const operador = await crearOperador();
    await prisma.$transaction((tx) =>
      createCounterAccount(tx, {
        idNumber: "V20000004",
        givenNames: "Ana",
        surnames: "Torres Díaz",
        phone: "0412-1112233",
        birthYear: 1995,
        panelUserId: operador.id,
      }),
    );

    await expect(
      registerAccount({
        idNumber: "V20000004",
        givenNames: "Ana",
        surnames: "Torres Díaz",
        phone: "0424-9998877",
        birthYear: 1995,
        password: "Pasajero.2026",
      }),
    ).rejects.toThrow(
      "Esta cédula tiene una cuenta creada en taquilla y los datos no coinciden. Acércate a la taquilla de tu agencia.",
    );

    const cuenta = await prisma.passengerAccount.findUniqueOrThrow({
      where: { idNumber: "V20000004" },
    });
    expect(cuenta.passwordHash).toBeNull();
  });

  it("registerAccount con un año de nacimiento distinto no activa la cuenta de taquilla", async () => {
    const operador = await crearOperador();
    await prisma.$transaction((tx) =>
      createCounterAccount(tx, {
        idNumber: "V20000005",
        givenNames: "Ana",
        surnames: "Torres Díaz",
        phone: "0412-1112233",
        birthYear: 1995,
        panelUserId: operador.id,
      }),
    );

    await expect(
      registerAccount({
        idNumber: "V20000005",
        givenNames: "Ana",
        surnames: "Torres Díaz",
        phone: "0412-1112233",
        birthYear: 1988,
        password: "Pasajero.2026",
      }),
    ).rejects.toThrow(
      "Esta cédula tiene una cuenta creada en taquilla y los datos no coinciden. Acércate a la taquilla de tu agencia.",
    );

    const cuenta = await prisma.passengerAccount.findUniqueOrThrow({
      where: { idNumber: "V20000005" },
    });
    expect(cuenta.passwordHash).toBeNull();
  });

  it("registrar de nuevo una cédula ya activada sigue rechazando el registro", async () => {
    await registerAccount({
      idNumber: "V20000006",
      givenNames: "Carla",
      surnames: "Núñez Ortiz",
      phone: "0412-1112233",
      birthYear: 1992,
      password: "Pasajero.2026",
    });

    await expect(
      registerAccount({
        idNumber: "V20000006",
        givenNames: "Carla",
        surnames: "Núñez Ortiz",
        phone: "0412-1112233",
        birthYear: 1992,
        password: "Otra.2026",
      }),
    ).rejects.toThrow(
      "Ya existe una cuenta con la cédula V20000006. Intenta ingresar en vez de registrarte.",
    );
  });
});
