import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/modules/auth";
import { ValidationError } from "@/modules/booking";
import { computeAmounts, getCurrentDepartureTax, getCurrentExchangeRate } from "@/modules/catalog";
import { listCounterOptions, lookupCounterHolder, quoteCounterSale } from "@/modules/counter";
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

describe("lookupCounterHolder", () => {
  it("cuenta encontrada: no expone el teléfono y calcula documentos faltantes", async () => {
    const agencia = await createAgencyFixture();
    const operador = await createPanelUserFixture({ agencyId: agencia.id });
    const cuenta = await createAccountFixture();

    const resultado = await lookupCounterHolder(cuenta.idNumber, {
      id: operador.id,
      agencyId: agencia.id,
    });

    expect(resultado.found).toBe(true);
    if (!resultado.found) throw new Error("se esperaba found=true");
    expect(resultado).not.toHaveProperty("phone");
    expect(resultado.accountId).toBe(cuenta.id);
    expect(resultado.hasCedula).toBe(true);
    expect(resultado.hasTravelPermit).toBe(false);
    expect(resultado.missingDocuments).toEqual([]);
    expect(resultado.activated).toBe(true);

    const auditoria = await prisma.auditLog.findFirstOrThrow({
      where: { entityId: cuenta.id, action: "CONSULTA_TITULAR_TAQUILLA" },
    });
    expect(auditoria.actorType).toBe("PANEL");
    expect(auditoria.actorPanelUserId).toBe(operador.id);
    expect(auditoria.after).toMatchObject({ idNumber: cuenta.idNumber, found: true });
  });

  it("cuenta sin cédula cargada: la reporta como faltante", async () => {
    const agencia = await createAgencyFixture();
    const operador = await createPanelUserFixture({ agencyId: agencia.id });
    const cuenta = await createAccountFixture({ withCedula: false });

    const resultado = await lookupCounterHolder(cuenta.idNumber, {
      id: operador.id,
      agencyId: agencia.id,
    });
    expect(resultado.found).toBe(true);
    if (!resultado.found) throw new Error("se esperaba found=true");
    expect(resultado.hasCedula).toBe(false);
    expect(resultado.missingDocuments).toEqual(["CEDULA"]);
  });

  it("cuenta no encontrada", async () => {
    const agencia = await createAgencyFixture();
    const operador = await createPanelUserFixture({ agencyId: agencia.id });

    const resultado = await lookupCounterHolder("V99999999", {
      id: operador.id,
      agencyId: agencia.id,
    });
    expect(resultado).toEqual({ found: false, idNumber: "V99999999" });

    const auditoria = await prisma.auditLog.findFirstOrThrow({
      where: { entityId: "sin-cuenta", action: "CONSULTA_TITULAR_TAQUILLA" },
    });
    expect(auditoria.after).toMatchObject({ idNumber: "V99999999", found: false });
  });

  it("cédula inválida: rechaza sin consultar", async () => {
    const agencia = await createAgencyFixture();
    const operador = await createPanelUserFixture({ agencyId: agencia.id });

    await expect(
      lookupCounterHolder("no-es-una-cedula!!", { id: operador.id, agencyId: agencia.id }),
    ).rejects.toThrow(ValidationError);
  });
});

describe("listCounterOptions", () => {
  it("solo trae salidas de la agencia con cupo y métodos físicos activos", async () => {
    const agencia = await createAgencyFixture();
    const { salida: propia } = await createDepartureFixture({ agencyId: agencia.id, capacity: 5 });
    const { salida: llena } = await createDepartureFixture({ agencyId: agencia.id, capacity: 0 });
    const otraAgencia = await createAgencyFixture();
    await createDepartureFixture({ agencyId: otraAgencia.id, capacity: 5 });

    const fisico = await createPaymentMethodFixture({ kind: "FISICO", currency: "USD" });
    await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
    const fisicoInactivo = await createPaymentMethodFixture({ kind: "FISICO", currency: "VES" });
    await prisma.paymentMethod.update({ where: { id: fisicoInactivo.id }, data: { active: false } });

    const opciones = await listCounterOptions(agencia.id);

    expect(opciones.departures.map((d) => d.id)).toContain(propia.id);
    expect(opciones.departures.map((d) => d.id)).not.toContain(llena.id);
    expect(opciones.paymentMethods.map((m) => m.id)).toContain(fisico.id);
    expect(opciones.paymentMethods.map((m) => m.id)).not.toContain(fisicoInactivo.id);
    expect(opciones.paymentMethods.every((m) => m.currency !== undefined)).toBe(true);
  });

  it("da la tasa de cambio vigente para VES y null para USD", async () => {
    const agencia = await createAgencyFixture();
    await createDepartureFixture({ agencyId: agencia.id, capacity: 5 });
    const fisicoUsd = await createPaymentMethodFixture({ kind: "FISICO", currency: "USD" });
    const fisicoVes = await createPaymentMethodFixture({ kind: "FISICO", currency: "VES" });

    const opciones = await listCounterOptions(agencia.id);

    const usd = opciones.paymentMethods.find((m) => m.id === fisicoUsd.id);
    const ves = opciones.paymentMethods.find((m) => m.id === fisicoVes.id);
    expect(usd?.rateFromUsd).toBeNull();
    expect(ves?.rateFromUsd).toBe("36.7412");
  });
});

describe("quoteCounterSale", () => {
  it("calcula los mismos totales que computeAmounts", async () => {
    const agencia = await createAgencyFixture();
    const { salida, ruta } = await createDepartureFixture({ agencyId: agencia.id });
    const metodo = await createPaymentMethodFixture({ kind: "FISICO", currency: "VES" });

    const ahora = new Date();
    const cotizacion = await quoteCounterSale({
      agencyId: agencia.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      passengerCount: 3,
      now: ahora,
    });

    const tasaSalida = await getCurrentDepartureTax(ahora);
    const tasaCambio = await getCurrentExchangeRate("VES", ahora);
    const esperado = computeAmounts({
      fareUsd: ruta.fareUsd,
      taxPerPassengerUsd: tasaSalida,
      passengerCount: 3,
      currency: "VES",
      rateFromUsd: tasaCambio,
    });

    expect(cotizacion.fareTotalUsd).toBe(esperado.fareTotalUsd.toString());
    expect(cotizacion.taxTotalUsd).toBe(esperado.taxTotalUsd.toString());
    expect(cotizacion.totalUsd).toBe(esperado.totalUsd.toString());
    expect(cotizacion.amountInCurrency).toBe(esperado.amountInCurrency.toString());
    expect(cotizacion.currency).toBe("VES");
  });

  it("rechaza una salida de otra agencia", async () => {
    const agencia = await createAgencyFixture();
    const otraAgencia = await createAgencyFixture();
    const { salida } = await createDepartureFixture({ agencyId: otraAgencia.id });
    const metodo = await createPaymentMethodFixture({ kind: "FISICO", currency: "USD" });

    await expect(
      quoteCounterSale({
        agencyId: agencia.id,
        departureId: salida.id,
        paymentMethodId: metodo.id,
        passengerCount: 1,
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("rechaza un método digital y una cantidad de pasajeros fuera de rango", async () => {
    const agencia = await createAgencyFixture();
    const { salida } = await createDepartureFixture({ agencyId: agencia.id });
    const metodoDigital = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
    const metodoFisico = await createPaymentMethodFixture({ kind: "FISICO", currency: "USD" });

    await expect(
      quoteCounterSale({
        agencyId: agencia.id,
        departureId: salida.id,
        paymentMethodId: metodoDigital.id,
        passengerCount: 1,
      }),
    ).rejects.toThrow(ValidationError);

    await expect(
      quoteCounterSale({
        agencyId: agencia.id,
        departureId: salida.id,
        paymentMethodId: metodoFisico.id,
        passengerCount: 7,
      }),
    ).rejects.toThrow("La cantidad de pasajeros debe estar entre 1 y 6.");
  });
});
