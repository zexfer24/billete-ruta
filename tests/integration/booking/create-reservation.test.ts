import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { formatCaracasDateTime24 } from "@/lib/time";
import {
  DepartureClosedError,
  MissingDocumentsError,
  NoSeatsAvailableError,
  RESERVATION_CODE_PATTERN,
  createReservation,
  getAvailability,
} from "@/modules/booking";
import {
  createAccountFixture,
  createAgencyFixture,
  createDepartureFixture,
  createPaymentMethodFixture,
  seedRatesFixture,
} from "../fixtures";
import { disconnect, resetDatabase } from "../setup";

beforeEach(async () => {
  await resetDatabase();
  await seedRatesFixture();
});
afterAll(disconnect);

describe("createReservation", () => {
  it("crea la reserva con sus pasajeros, serial y mensaje encolado", async () => {
    const { salida } = await createDepartureFixture({ capacity: 40 });
    const metodo = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
    const cuenta = await createAccountFixture();

    const resultado = await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      companions: [
        { fullName: "Acompañante Uno", idNumber: "V11111111", birthYear: 1992 },
        { fullName: "Acompañante Dos", idNumber: "V22222222", birthYear: 1988 },
      ],
      policiesAccepted: true,
    });

    expect(resultado.code).toMatch(RESERVATION_CODE_PATTERN);
    expect(resultado.status).toBe("PENDIENTE_PAGO");

    const reserva = await prisma.reservation.findUniqueOrThrow({
      where: { id: resultado.reservationId },
      include: { passengers: true, messages: true },
    });
    expect(reserva.passengerCount).toBe(3);
    expect(reserva.passengers).toHaveLength(3);
    expect(reserva.passengers.filter((p) => p.isHolder)).toHaveLength(1);
    expect(reserva.expiresAt).not.toBeNull();
    expect(reserva.messages.map((m) => m.templateKey)).toEqual(["solicitud_recibida"]);
  });

  it("si el bus sale antes de las 2 horas, el mensaje da la salida como hora límite", async () => {
    const { salida, ruta } = await createDepartureFixture({ hoursFromNow: 39 / 60 });
    const metodo = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
    const cuenta = await createAccountFixture();

    const resultado = await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      companions: [],
      policiesAccepted: true,
    });

    const [mensaje] = await prisma.outboundMessage.findMany({ where: { reservationId: resultado.reservationId } });
    const payload = mensaje?.payload as Record<string, string>;
    expect(payload.ruta).toBe(`${ruta.origin} → ${ruta.destination}`);
    expect(payload.limite).toBe(formatCaracasDateTime24(salida.departsAt));
    expect(payload.limite).toBe(payload.salida);
    // Se guarda el texto exacto que se envía.
    expect(payload._texto).toContain(`en el viaje ${ruta.origin} → ${ruta.destination}`);
    expect(payload._texto).not.toContain("próximas 2 horas");
  });

  it("separa tarifa y tasa de salida, y las congela en la reserva", async () => {
    const { salida, ruta } = await createDepartureFixture();
    const metodo = await createPaymentMethodFixture({ currency: "USD" });
    const cuenta = await createAccountFixture();

    const { reservationId } = await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      companions: [{ fullName: "Acompañante", idNumber: "V33333333", birthYear: 1995 }],
      policiesAccepted: true,
    });

    // Cambiar la tarifa después no debe alterar la reserva ya creada.
    await prisma.route.update({ where: { id: ruta.id }, data: { fareUsd: "99.00" } });

    const reserva = await prisma.reservation.findUniqueOrThrow({ where: { id: reservationId } });
    expect(reserva.fareUsd.toString()).toBe("45");
    expect(reserva.fareTotalUsd.toString()).toBe("90");
    expect(reserva.taxPerPassengerUsd.toString()).toBe("2.5");
    expect(reserva.taxTotalUsd.toString()).toBe("5");
    expect(reserva.totalUsd.toString()).toBe("95");
  });

  it("guarda la tasa de cambio vigente al pagar en bolívares", async () => {
    const { salida } = await createDepartureFixture();
    const metodo = await createPaymentMethodFixture({ currency: "VES" });
    const cuenta = await createAccountFixture();

    const { reservationId } = await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      companions: [],
      policiesAccepted: true,
    });

    const reserva = await prisma.reservation.findUniqueOrThrow({ where: { id: reservationId } });
    expect(reserva.exchangeRateUsed.toString()).toBe("36.7412");
    // 47.50 USD × 36.7412 = 1745.207
    expect(reserva.amountInCurrency.toString()).toBe("1745.21");
  });

  it("crea una reserva condicional con método físico", async () => {
    const { salida } = await createDepartureFixture();
    const metodo = await createPaymentMethodFixture({ kind: "FISICO", currency: "USD" });
    const cuenta = await createAccountFixture();

    const resultado = await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      companions: [],
      policiesAccepted: true,
    });

    expect(resultado.status).toBe("PAGO_EN_SITIO");
    const reserva = await prisma.reservation.findUniqueOrThrow({
      where: { id: resultado.reservationId },
      include: { messages: true },
    });
    expect(reserva.expiresAt).toBeNull();
    expect(reserva.messages.map((m) => m.templateKey)).toEqual(["reserva_condicional"]);
  });

  it("rechaza el pago físico cuando faltan menos de doce horas", async () => {
    const { salida } = await createDepartureFixture({ hoursFromNow: 6 });
    const metodo = await createPaymentMethodFixture({ kind: "FISICO" });
    const cuenta = await createAccountFixture();

    await expect(
      createReservation({
        accountId: cuenta.id,
        departureId: salida.id,
        paymentMethodId: metodo.id,
        companions: [],
        policiesAccepted: true,
      }),
    ).rejects.toThrow(/12 horas/);
  });

  it("exige la foto de la cédula antes de reservar", async () => {
    const { salida } = await createDepartureFixture();
    const metodo = await createPaymentMethodFixture();
    const cuenta = await createAccountFixture({ withCedula: false });

    await expect(
      createReservation({
        accountId: cuenta.id,
        departureId: salida.id,
        paymentMethodId: metodo.id,
        companions: [],
        policiesAccepted: true,
      }),
    ).rejects.toThrow(MissingDocumentsError);
  });

  it("exige el permiso de viaje cuando viaja un menor de edad", async () => {
    const { salida } = await createDepartureFixture();
    const metodo = await createPaymentMethodFixture();
    const cuenta = await createAccountFixture();

    await expect(
      createReservation({
        accountId: cuenta.id,
        departureId: salida.id,
        paymentMethodId: metodo.id,
        companions: [{ fullName: "Niño Pérez", idNumber: "V44444444", birthYear: 2015 }],
        policiesAccepted: true,
      }),
    ).rejects.toThrow(/permiso de viaje/i);
  });

  it("acepta al menor cuando el permiso está cargado", async () => {
    const { salida } = await createDepartureFixture();
    const metodo = await createPaymentMethodFixture();
    const cuenta = await createAccountFixture({ withPermiso: true });

    const resultado = await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      companions: [{ fullName: "Niño Pérez", idNumber: "V44444444", birthYear: 2015 }],
      policiesAccepted: true,
    });
    expect(resultado.code).toMatch(RESERVATION_CODE_PATTERN);
  });

  it("no permite reservar si el manifiesto está cerrado", async () => {
    const { salida } = await createDepartureFixture();
    await prisma.departure.update({
      where: { id: salida.id },
      data: { status: "MANIFIESTO_CERRADO" },
    });
    const metodo = await createPaymentMethodFixture();
    const cuenta = await createAccountFixture();

    await expect(
      createReservation({
        accountId: cuenta.id,
        departureId: salida.id,
        paymentMethodId: metodo.id,
        companions: [],
        policiesAccepted: true,
      }),
    ).rejects.toThrow(DepartureClosedError);
  });

  it("rechaza un grupo que no cabe en el cupo restante", async () => {
    const { salida } = await createDepartureFixture({ capacity: 4 });
    const metodo = await createPaymentMethodFixture();
    const primera = await createAccountFixture();
    const segunda = await createAccountFixture();

    await createReservation({
      accountId: primera.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      companions: [
        { fullName: "Uno", idNumber: "V11111111", birthYear: 1990 },
        { fullName: "Dos", idNumber: "V22222222", birthYear: 1990 },
      ],
      policiesAccepted: true,
    });

    await expect(
      createReservation({
        accountId: segunda.id,
        departureId: salida.id,
        paymentMethodId: metodo.id,
        companions: [{ fullName: "Tres", idNumber: "V33333333", birthYear: 1990 }],
        policiesAccepted: true,
      }),
    ).rejects.toThrow(NoSeatsAvailableError);
  });

  it("no sobrevende con veinte compras simultáneas sobre diez puestos", async () => {
    const { salida } = await createDepartureFixture({ capacity: 10 });
    const metodo = await createPaymentMethodFixture();
    const cuentas = await Promise.all(
      Array.from({ length: 20 }, () => createAccountFixture()),
    );

    const resultados = await Promise.all(
      cuentas.map((cuenta) =>
        createReservation({
          accountId: cuenta.id,
          departureId: salida.id,
          paymentMethodId: metodo.id,
          companions: [],
          policiesAccepted: true,
        })
          .then(() => "ok" as const)
          .catch(() => "fallo" as const),
      ),
    );

    expect(resultados.filter((r) => r === "ok")).toHaveLength(10);
    expect(await prisma.reservation.count({ where: { departureId: salida.id } })).toBe(10);
    expect((await getAvailability(salida.id)).available).toBe(0);
  });

  it("un método digital COP sin tasa de cambio vigente: rechaza", async () => {
    const { salida } = await createDepartureFixture();
    const metodo = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "COP" });
    await prisma.exchangeRate.deleteMany({ where: { currency: "COP" } });
    const cuenta = await createAccountFixture();

    await expect(
      createReservation({
        accountId: cuenta.id,
        departureId: salida.id,
        paymentMethodId: metodo.id,
        companions: [],
        policiesAccepted: true,
      }),
    ).rejects.toThrow(
      "No hay una tasa de cambio vigente para COP. El administrador debe cargarla.",
    );
  });

  it("un método de pago de otra agencia: rechaza; uno del terminal sí reserva", async () => {
    const { salida } = await createDepartureFixture();
    const otraAgencia = await createAgencyFixture();
    const metodoAjeno = await createPaymentMethodFixture({
      kind: "DIGITAL",
      currency: "USD",
      agencyId: otraAgencia.id,
    });
    const cuenta = await createAccountFixture();

    await expect(
      createReservation({
        accountId: cuenta.id,
        departureId: salida.id,
        paymentMethodId: metodoAjeno.id,
        companions: [],
        policiesAccepted: true,
      }),
    ).rejects.toThrow("Ese método de pago no está disponible.");

    const metodoTerminal = await createPaymentMethodFixture({
      kind: "DIGITAL",
      currency: "USD",
      agencyId: null,
    });
    const resultado = await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: metodoTerminal.id,
      companions: [],
      policiesAccepted: true,
    });
    expect(resultado.code).toMatch(RESERVATION_CODE_PATTERN);
  });

  it("deja rastro en la bitácora", async () => {
    const { salida } = await createDepartureFixture();
    const metodo = await createPaymentMethodFixture();
    const cuenta = await createAccountFixture();

    const { reservationId } = await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      companions: [],
      policiesAccepted: true,
    });

    const entradas = await prisma.auditLog.findMany({
      where: { entityId: reservationId, action: "RESERVA_CREADA" },
    });
    expect(entradas).toHaveLength(1);
    expect(entradas[0]?.actorAccountId).toBe(cuenta.id);
  });
});

describe("getAvailability", () => {
  it("cuenta como ocupados solo los estados activos", async () => {
    const { salida } = await createDepartureFixture({ capacity: 10 });
    const metodo = await createPaymentMethodFixture();

    const estados = [
      ["PAGADA", 2],
      ["EN_VALIDACION", 1],
      ["ABONADA", 1],
      ["PAGO_EN_SITIO", 1],
      ["PENDIENTE_PAGO", 1],
      ["ABORDADA", 1],
      ["LIBERADA", 3],
      ["CANCELADA", 2],
      ["NO_SHOW", 1],
    ] as const;

    for (const [estado, pasajeros] of estados) {
      const cuenta = await createAccountFixture();
      await prisma.reservation.create({
        data: {
          code: `TR-0101-1PAX-${estado.slice(0, 4)}`,
          publicToken: `tok-${estado}`,
          accountId: cuenta.id,
          departureId: salida.id,
          paymentMethodId: metodo.id,
          status: estado,
          passengerCount: pasajeros,
          policiesAcceptedAt: new Date(),
          fareUsd: "45.00",
          fareTotalUsd: "45.00",
          taxPerPassengerUsd: "2.50",
          taxTotalUsd: "2.50",
          totalUsd: "47.50",
          currency: "USD",
          exchangeRateUsed: "1",
          amountInCurrency: "47.50",
        },
      });
    }

    expect(await getAvailability(salida.id)).toEqual({
      capacity: 10,
      occupied: 7,
      available: 3,
    });
  });
});
