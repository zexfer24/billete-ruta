import { promises as fsp, readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/modules/auth";
import {
  DepartureClosedError,
  MissingDocumentsError,
  NoSeatsAvailableError,
  ValidationError,
  createReservation,
} from "@/modules/booking";
import { sellAtCounter } from "@/modules/counter";
import { startBoarding } from "@/modules/trips";
import {
  createAccountFixture,
  createAgencyFixture,
  createDepartureFixture,
  createPanelUserFixture,
  createPaymentMethodFixture,
  seedRatesFixture,
} from "../fixtures";
import { disconnect, resetDatabase } from "../setup";

beforeEach(async () => {
  await resetDatabase();
  await seedRatesFixture();
});
afterAll(disconnect);

/** PNG mínimo válido: firma PNG más un IHDR cualquiera. `assertImageBuffer` solo mira los primeros bytes. */
function pngBuffer(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89,
  ]);
}

function fixtureImage(name: string): Buffer {
  return readFileSync(path.resolve(__dirname, "../../fixtures", name));
}

async function countUploadedFiles(): Promise<number> {
  const base = path.resolve(getEnv().UPLOADS_DIR, "documentos");
  try {
    const entradas = await fsp.readdir(base, { recursive: true, withFileTypes: true });
    return entradas.filter((e) => e.isFile()).length;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0;
    throw error;
  }
}

async function escenario(overrides: { capacity?: number; hoursFromNow?: number } = {}) {
  const agencia = await createAgencyFixture();
  const operador = await createPanelUserFixture({ agencyId: agencia.id });
  const { salida } = await createDepartureFixture({
    agencyId: agencia.id,
    capacity: overrides.capacity ?? 40,
    hoursFromNow: overrides.hoursFromNow,
  });
  const metodo = await createPaymentMethodFixture({ kind: "FISICO", currency: "USD" });
  return { agencia, operador, salida, metodo };
}

describe("sellAtCounter", () => {
  it("cuenta nueva, un pasajero con foto de cédula: vende, cobra y emite el ticket", async () => {
    const { agencia, operador, salida, metodo } = await escenario();

    const resultado = await sellAtCounter({
      panelUserId: operador.id,
      agencyId: agencia.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      holder: {
        idNumber: "V30000001",
        givenNames: "Nueva",
        surnames: "Cuenta Prueba",
        phone: "0412-1112233",
        birthYear: 1990,
      },
      companions: [],
      documents: { cedula: { originalName: "cedula.png", data: pngBuffer() } },
      policiesAccepted: true,
    });

    expect(resultado.accountCreated).toBe(true);

    const reserva = await prisma.reservation.findUniqueOrThrow({
      where: { id: resultado.reservationId },
      include: { messages: true, cashPayments: true, ticket: true, account: true },
    });
    expect(reserva.status).toBe("PAGADA");
    expect(reserva.salesChannel).toBe("TAQUILLA");
    expect(reserva.soldByPanelUserId).toBe(operador.id);
    expect(reserva.account.passwordHash).toBeNull();
    expect(reserva.account.createdByPanelUserId).toBe(operador.id);
    expect(reserva.cashPayments).toHaveLength(1);
    expect(reserva.cashPayments[0]?.amountUsd.toString()).toBe(reserva.totalUsd.toString());
    expect(reserva.paidUsd.toString()).toBe(reserva.totalUsd.toString());
    expect(reserva.ticket).not.toBeNull();
    expect(reserva.messages.some((m) => m.templateKey === "reserva_condicional")).toBe(false);
    expect(reserva.messages.some((m) => m.templateKey === "ticket_emitido")).toBe(true);

    const auditoria = await prisma.auditLog.findFirstOrThrow({
      where: { entityId: resultado.reservationId, action: "RESERVA_CREADA" },
    });
    expect(auditoria.actorType).toBe("PANEL");
    expect(auditoria.actorPanelUserId).toBe(operador.id);
    expect(auditoria.actorAccountId).toBeNull();

    const documento = await prisma.passengerDocument.findFirstOrThrow({
      where: { accountId: resultado.accountId, type: "CEDULA" },
    });
    const rutaArchivo = path.resolve(getEnv().UPLOADS_DIR, documento.filePath);
    await expect(fsp.access(rutaArchivo)).resolves.toBeUndefined();
  });

  it("cuenta existente con cédula ya cargada y un acompañante: no duplica la cuenta ni exige archivo", async () => {
    const { agencia, operador, salida, metodo } = await escenario();
    const cuenta = await createAccountFixture();

    const resultado = await sellAtCounter({
      panelUserId: operador.id,
      agencyId: agencia.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      holder: { idNumber: cuenta.idNumber },
      companions: [{ fullName: "Acompañante Uno", idNumber: "V31000001", birthYear: 1991 }],
      documents: {},
      policiesAccepted: true,
    });

    expect(resultado.accountCreated).toBe(false);
    expect(resultado.accountId).toBe(cuenta.id);
    expect(await prisma.passengerAccount.count({ where: { idNumber: cuenta.idNumber } })).toBe(1);

    const reserva = await prisma.reservation.findUniqueOrThrow({
      where: { id: resultado.reservationId },
    });
    expect(reserva.status).toBe("PAGADA");
    expect(reserva.passengerCount).toBe(2);
  });

  it("cuenta existente sin foto de cédula y sin archivo: no vende ni cobra", async () => {
    const { agencia, operador, salida, metodo } = await escenario();
    const cuenta = await createAccountFixture({ withCedula: false });

    await expect(
      sellAtCounter({
        panelUserId: operador.id,
        agencyId: agencia.id,
        departureId: salida.id,
        paymentMethodId: metodo.id,
        holder: { idNumber: cuenta.idNumber },
        companions: [],
        documents: {},
        policiesAccepted: true,
      }),
    ).rejects.toThrow(MissingDocumentsError);

    expect(await prisma.reservation.count({ where: { departureId: salida.id } })).toBe(0);
    expect(await prisma.cashPayment.count()).toBe(0);
  });

  it("acompañante menor sin permiso se rechaza; con el permiso se vende", async () => {
    const { agencia, operador, salida, metodo } = await escenario();
    const cuenta = await createAccountFixture();

    await expect(
      sellAtCounter({
        panelUserId: operador.id,
        agencyId: agencia.id,
        departureId: salida.id,
        paymentMethodId: metodo.id,
        holder: { idNumber: cuenta.idNumber },
        companions: [{ fullName: "Niño Pérez", idNumber: "V31000002", birthYear: 2015 }],
        documents: {},
        policiesAccepted: true,
      }),
    ).rejects.toThrow(MissingDocumentsError);

    const resultado = await sellAtCounter({
      panelUserId: operador.id,
      agencyId: agencia.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      holder: { idNumber: cuenta.idNumber },
      companions: [{ fullName: "Niño Pérez", idNumber: "V31000002", birthYear: 2015 }],
      documents: { travelPermit: { originalName: "permiso.png", data: pngBuffer() } },
      policiesAccepted: true,
    });
    expect(resultado.reservationId).toBeDefined();
  });

  it("con foto del pasajero: crea el documento FOTO_PERFIL, guarda el archivo y audita con actor PANEL", async () => {
    const { agencia, operador, salida, metodo } = await escenario();
    const cuenta = await createAccountFixture();

    const resultado = await sellAtCounter({
      panelUserId: operador.id,
      agencyId: agencia.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      holder: { idNumber: cuenta.idNumber },
      companions: [],
      documents: { profilePhoto: { originalName: "perfil.png", data: fixtureImage("cedula.png") } },
      policiesAccepted: true,
    });

    const documento = await prisma.passengerDocument.findFirstOrThrow({
      where: { accountId: resultado.accountId, type: "FOTO_PERFIL" },
    });
    await expect(fsp.access(path.resolve(getEnv().UPLOADS_DIR, documento.filePath))).resolves.toBeUndefined();

    const auditoria = await prisma.auditLog.findFirstOrThrow({
      where: { entityId: documento.id, action: "DOCUMENTO_CARGADO" },
    });
    expect(auditoria.actorType).toBe("PANEL");
    expect(auditoria.actorPanelUserId).toBe(operador.id);
  });

  it("sin foto del pasajero: no crea ningún documento FOTO_PERFIL", async () => {
    const { agencia, operador, salida, metodo } = await escenario();
    const cuenta = await createAccountFixture();

    const resultado = await sellAtCounter({
      panelUserId: operador.id,
      agencyId: agencia.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      holder: { idNumber: cuenta.idNumber },
      companions: [],
      documents: {},
      policiesAccepted: true,
    });

    expect(resultado.reservationId).toBeDefined();
    expect(await prisma.passengerDocument.count({ where: { type: "FOTO_PERFIL" } })).toBe(0);
  });

  it("foto del pasajero que no es imagen: rechaza la venta y no deja archivos guardados", async () => {
    const { agencia, operador, salida, metodo } = await escenario();
    const cuenta = await createAccountFixture();
    const antes = await countUploadedFiles();

    await expect(
      sellAtCounter({
        panelUserId: operador.id,
        agencyId: agencia.id,
        departureId: salida.id,
        paymentMethodId: metodo.id,
        holder: { idNumber: cuenta.idNumber },
        companions: [],
        documents: { profilePhoto: { originalName: "perfil.png", data: fixtureImage("no-es-imagen.png") } },
        policiesAccepted: true,
      }),
    ).rejects.toThrow(ValidationError);

    expect(await countUploadedFiles()).toBe(antes);
    expect(await prisma.passengerDocument.count({ where: { type: "FOTO_PERFIL" } })).toBe(0);
    expect(await prisma.reservation.count({ where: { departureId: salida.id } })).toBe(0);
    expect(await prisma.cashPayment.count()).toBe(0);
  });

  it("salida de otra agencia: rechaza, no crea la cuenta y borra el archivo guardado", async () => {
    const { agencia, operador } = await escenario();
    const otraAgencia = await createAgencyFixture();
    const { salida: salidaAjena } = await createDepartureFixture({ agencyId: otraAgencia.id });
    const metodo = await createPaymentMethodFixture({ kind: "FISICO", currency: "USD" });

    const antes = await countUploadedFiles();

    await expect(
      sellAtCounter({
        panelUserId: operador.id,
        agencyId: agencia.id,
        departureId: salidaAjena.id,
        paymentMethodId: metodo.id,
        holder: {
          idNumber: "V30000005",
          givenNames: "Ajena",
          surnames: "Cuenta Prueba",
          phone: "0412-1112233",
          birthYear: 1990,
        },
        companions: [],
        documents: { cedula: { originalName: "cedula.png", data: pngBuffer() } },
        policiesAccepted: true,
      }),
    ).rejects.toThrow(ForbiddenError);

    expect(await prisma.passengerAccount.findUnique({ where: { idNumber: "V30000005" } })).toBeNull();
    expect(await countUploadedFiles()).toBe(antes);
  });

  it("salida en menos de 12 horas con método físico: la taquilla sí vende", async () => {
    const { agencia, operador, salida, metodo } = await escenario({ hoursFromNow: 6 });
    const cuenta = await createAccountFixture();

    const resultado = await sellAtCounter({
      panelUserId: operador.id,
      agencyId: agencia.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      holder: { idNumber: cuenta.idNumber },
      companions: [],
      documents: {},
      policiesAccepted: true,
    });
    expect(resultado.reservationId).toBeDefined();
  });

  it("salida con el manifiesto cerrado: rechaza", async () => {
    const { agencia, operador, salida, metodo } = await escenario();
    await startBoarding({ departureId: salida.id, panelUserId: operador.id, agencyId: agencia.id });
    const cuenta = await createAccountFixture();

    await expect(
      sellAtCounter({
        panelUserId: operador.id,
        agencyId: agencia.id,
        departureId: salida.id,
        paymentMethodId: metodo.id,
        holder: { idNumber: cuenta.idNumber },
        companions: [],
        documents: {},
        policiesAccepted: true,
      }),
    ).rejects.toThrow(DepartureClosedError);
  });

  it("sin cupo: rechaza y no persiste nada", async () => {
    const { agencia, operador, salida, metodo } = await escenario({ capacity: 1 });
    const primera = await createAccountFixture();
    const metodoDigital = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
    await createReservation({
      accountId: primera.id,
      departureId: salida.id,
      paymentMethodId: metodoDigital.id,
      companions: [],
      policiesAccepted: true,
    });

    const antes = await countUploadedFiles();

    await expect(
      sellAtCounter({
        panelUserId: operador.id,
        agencyId: agencia.id,
        departureId: salida.id,
        paymentMethodId: metodo.id,
        holder: {
          idNumber: "V30000009",
          givenNames: "Sin",
          surnames: "Cupo Prueba",
          phone: "0412-1112233",
          birthYear: 1990,
        },
        companions: [],
        documents: { cedula: { originalName: "cedula.png", data: pngBuffer() } },
        policiesAccepted: true,
      }),
    ).rejects.toThrow(NoSeatsAvailableError);

    expect(await prisma.passengerAccount.findUnique({ where: { idNumber: "V30000009" } })).toBeNull();
    expect(await prisma.reservation.count({ where: { departureId: salida.id } })).toBe(1);
    expect(await prisma.cashPayment.count()).toBe(0);
    expect(await countUploadedFiles()).toBe(antes);
  });

  it("dos ventas simultáneas por el último puesto: solo una gana", async () => {
    const { agencia, operador, salida, metodo } = await escenario({ capacity: 1 });

    const resultados = await Promise.allSettled([
      sellAtCounter({
        panelUserId: operador.id,
        agencyId: agencia.id,
        departureId: salida.id,
        paymentMethodId: metodo.id,
        holder: {
          idNumber: "V30000010",
          givenNames: "Compradora",
          surnames: "Uno Prueba",
          phone: "0412-1112233",
          birthYear: 1990,
        },
        companions: [],
        documents: { cedula: { originalName: "cedula.png", data: pngBuffer() } },
        policiesAccepted: true,
      }),
      sellAtCounter({
        panelUserId: operador.id,
        agencyId: agencia.id,
        departureId: salida.id,
        paymentMethodId: metodo.id,
        holder: {
          idNumber: "V30000011",
          givenNames: "Comprador",
          surnames: "Dos Prueba",
          phone: "0412-1112233",
          birthYear: 1990,
        },
        companions: [],
        documents: { cedula: { originalName: "cedula.png", data: pngBuffer() } },
        policiesAccepted: true,
      }),
    ]);

    const cumplidas = resultados.filter((r) => r.status === "fulfilled");
    const rechazadas = resultados.filter((r) => r.status === "rejected");
    expect(cumplidas).toHaveLength(1);
    expect(rechazadas).toHaveLength(1);
    expect((rechazadas[0] as PromiseRejectedResult).reason).toBeInstanceOf(NoSeatsAvailableError);
    expect(await prisma.reservation.count({ where: { departureId: salida.id } })).toBe(1);
  });

  it("método digital: rechaza con el mensaje exacto", async () => {
    const { agencia, operador, salida } = await escenario();
    const metodoDigital = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
    const cuenta = await createAccountFixture();

    await expect(
      sellAtCounter({
        panelUserId: operador.id,
        agencyId: agencia.id,
        departureId: salida.id,
        paymentMethodId: metodoDigital.id,
        holder: { idNumber: cuenta.idNumber },
        companions: [],
        documents: {},
        policiesAccepted: true,
      }),
    ).rejects.toThrow("La venta en taquilla requiere un método de pago en efectivo.");
  });

  it("faltan datos del titular nuevo: rechaza antes de guardar archivos", async () => {
    const { agencia, operador, salida, metodo } = await escenario();
    const antes = await countUploadedFiles();

    await expect(
      sellAtCounter({
        panelUserId: operador.id,
        agencyId: agencia.id,
        departureId: salida.id,
        paymentMethodId: metodo.id,
        holder: { idNumber: "V30000020", givenNames: "Falta Datos" },
        companions: [],
        documents: { cedula: { originalName: "cedula.png", data: pngBuffer() } },
        policiesAccepted: true,
      }),
    ).rejects.toThrow(
      "Completa nombres, apellidos, teléfono y año de nacimiento del titular.",
    );

    expect(await countUploadedFiles()).toBe(antes);
    expect(await prisma.passengerAccount.findUnique({ where: { idNumber: "V30000020" } })).toBeNull();
  });

  it("reserva en bolívares: queda pagada sin diferencia de centavos", async () => {
    const { agencia, operador, salida } = await escenario();
    const metodoVes = await createPaymentMethodFixture({ kind: "FISICO", currency: "VES" });
    const cuenta = await createAccountFixture();

    const resultado = await sellAtCounter({
      panelUserId: operador.id,
      agencyId: agencia.id,
      departureId: salida.id,
      paymentMethodId: metodoVes.id,
      holder: { idNumber: cuenta.idNumber },
      companions: [],
      documents: {},
      policiesAccepted: true,
    });

    const reserva = await prisma.reservation.findUniqueOrThrow({
      where: { id: resultado.reservationId },
    });
    expect(reserva.status).toBe("PAGADA");
    expect(reserva.paidUsd.toString()).toBe(reserva.totalUsd.toString());
  });

  it("un método físico COP sin tasa vigente: rechaza y no persiste nada", async () => {
    const { agencia, operador, salida } = await escenario();
    const metodoCop = await createPaymentMethodFixture({ kind: "FISICO", currency: "COP" });
    await prisma.exchangeRate.deleteMany({ where: { currency: "COP" } });
    const cuenta = await createAccountFixture();

    await expect(
      sellAtCounter({
        panelUserId: operador.id,
        agencyId: agencia.id,
        departureId: salida.id,
        paymentMethodId: metodoCop.id,
        holder: { idNumber: cuenta.idNumber },
        companions: [],
        documents: {},
        policiesAccepted: true,
      }),
    ).rejects.toThrow(
      "No hay una tasa de cambio vigente para COP. El administrador debe cargarla.",
    );

    expect(await prisma.reservation.count({ where: { departureId: salida.id } })).toBe(0);
    expect(await prisma.cashPayment.count()).toBe(0);
  });

  it("un método de pago de otra agencia: rechaza; uno del terminal sí vende", async () => {
    const { agencia, operador, salida } = await escenario();
    const otraAgencia = await createAgencyFixture();
    const metodoAjeno = await createPaymentMethodFixture({
      kind: "FISICO",
      currency: "USD",
      agencyId: otraAgencia.id,
    });
    const cuenta = await createAccountFixture();

    await expect(
      sellAtCounter({
        panelUserId: operador.id,
        agencyId: agencia.id,
        departureId: salida.id,
        paymentMethodId: metodoAjeno.id,
        holder: { idNumber: cuenta.idNumber },
        companions: [],
        documents: {},
        policiesAccepted: true,
      }),
    ).rejects.toThrow(ValidationError);
    expect(await prisma.reservation.count({ where: { departureId: salida.id } })).toBe(0);

    const metodoTerminal = await createPaymentMethodFixture({
      kind: "FISICO",
      currency: "USD",
      agencyId: null,
    });
    const resultado = await sellAtCounter({
      panelUserId: operador.id,
      agencyId: agencia.id,
      departureId: salida.id,
      paymentMethodId: metodoTerminal.id,
      holder: { idNumber: cuenta.idNumber },
      companions: [],
      documents: {},
      policiesAccepted: true,
    });
    expect(resultado.reservationId).toBeDefined();
  });
});
