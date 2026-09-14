import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/modules/audit";
import { createVehicle } from "@/modules/agencies";
import { createReservation } from "@/modules/booking";
import { approveProof, submitProof } from "@/modules/payments";
import { listAgencyActivity } from "@/modules/reports";
import {
  createAccountFixture,
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

describe("listAgencyActivity", () => {
  it("trae la actividad de la agencia en orden descendente, sin datos de otra agencia ni consultas", async () => {
    const from = new Date(Date.now() - 3_600_000);
    const to = new Date(Date.now() + 3_600_000);

    // Agencia A: reserva creada por un pasajero, comprobante cargado, un
    // operador que lo aprueba, otro que crea un vehículo, y una consulta
    // directa que no debe aparecer.
    const { salida: salidaA, agencia: agenciaA } = await createDepartureFixture({ capacity: 20 });
    const metodoA = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
    const cuentaA = await createAccountFixture();
    const operadorA1 = await createPanelUserFixture({ agencyId: agenciaA.id });
    const operadorA2 = await createPanelUserFixture({ agencyId: agenciaA.id });

    const reservaA = await createReservation({
      accountId: cuentaA.id,
      departureId: salidaA.id,
      paymentMethodId: metodoA.id,
      companions: [],
      policiesAccepted: true,
    });

    const comprobanteA = await submitProof({
      reservationId: reservaA.reservationId,
      accountId: cuentaA.id,
      paymentMethodId: metodoA.id,
      reference: "REF-A-0001",
      amount: "20.00",
      currency: "USD",
      imagePath: "comprobantes/a/1.png",
    });

    await approveProof({
      proofId: comprobanteA.proofId,
      panelUserId: operadorA1.id,
      agencyId: agenciaA.id,
    });

    await createVehicle({
      agencyId: agenciaA.id,
      plate: "AAA1234",
      brand: "Marca",
      model: "Modelo",
      seatCount: 40,
      panelUserId: operadorA2.id,
    });

    await writeAudit(prisma, {
      actorType: "PANEL",
      actorPanelUserId: operadorA1.id,
      entityType: "PassengerAccount",
      entityId: "consulta",
      action: "CONSULTA_USUARIOS",
      after: {},
    });

    // Agencia B: un operador aprueba un pago de una reserva con su comprobante.
    const { salida: salidaB, agencia: agenciaB } = await createDepartureFixture({ capacity: 20 });
    const metodoB = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
    const cuentaB = await createAccountFixture();
    const operadorB = await createPanelUserFixture({ agencyId: agenciaB.id });

    const reservaB = await createReservation({
      accountId: cuentaB.id,
      departureId: salidaB.id,
      paymentMethodId: metodoB.id,
      companions: [],
      policiesAccepted: true,
    });
    const comprobanteB = await submitProof({
      reservationId: reservaB.reservationId,
      accountId: cuentaB.id,
      paymentMethodId: metodoB.id,
      reference: "REF-B-0001",
      amount: "20.00",
      currency: "USD",
      imagePath: "comprobantes/b/1.png",
    });
    await approveProof({
      proofId: comprobanteB.proofId,
      panelUserId: operadorB.id,
      agencyId: agenciaB.id,
    });

    const resultado = await listAgencyActivity(agenciaA.id, { from, to });

    expect(resultado.truncated).toBe(false);

    // RESERVA_CREADA, ESTADO_EN_VALIDACION, COMPROBANTE_CARGADO, ESTADO_ABONADA,
    // PAGO_APROBADO y VEHICULO_CREADO: seis entradas propias de la agencia A.
    // La consulta directa (CONSULTA_USUARIOS) queda excluida.
    expect(resultado.rows).toHaveLength(6);

    const textos = resultado.rows.map((r) => r.text);
    expect(textos).toContain(`El pasajero creó la reserva ${reservaA.code}`);
    expect(textos).toContain(`${operadorA1.name} aprobó un pago de ${reservaA.code}`);
    expect(textos).toContain(`${operadorA2.name} registró el vehículo AAA1234`);

    // Orden descendente: lo más reciente primero.
    for (let i = 1; i < resultado.rows.length; i++) {
      expect(resultado.rows[i - 1]!.at.getTime()).toBeGreaterThanOrEqual(
        resultado.rows[i]!.at.getTime(),
      );
    }
    const indiceVehiculo = textos.findIndex((t) => t.includes("registró el vehículo"));
    const indiceReserva = textos.findIndex((t) => t.includes("creó la reserva"));
    expect(indiceVehiculo).toBeLessThan(indiceReserva);

    // Nada de la agencia B.
    expect(textos.some((t) => t.includes(reservaB.code))).toBe(false);
    expect(textos.some((t) => t.includes(operadorB.name))).toBe(false);

    // Ninguna cédula.
    expect(textos.every((t) => !t.includes(cuentaA.idNumber))).toBe(true);
    expect(textos.every((t) => !t.includes(cuentaB.idNumber))).toBe(true);
  });

  it("limit por defecto en 20, con tope de 100", async () => {
    const { agencia } = await createDepartureFixture({ capacity: 5 });
    const from = new Date(Date.now() - 3_600_000);
    const to = new Date(Date.now() + 3_600_000);

    const conDefecto = await listAgencyActivity(agencia.id, { from, to });
    expect(conDefecto.rows.length).toBeLessThanOrEqual(20);

    const conTope = await listAgencyActivity(agencia.id, { from, to, limit: 500 });
    expect(conTope.rows.length).toBeLessThanOrEqual(100);
  });
});
