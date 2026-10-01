import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ValidationError, createReservation } from "@/modules/booking";
import {
  ALREADY_PAID_CASH_MESSAGE,
  approveProof,
  registerCashPayment,
  submitProof,
} from "@/modules/payments";
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

/** Reserva de un pasajero: 45 de tarifa + 2,50 de tasa = 47,50 USD. */
async function escenario(kind: "DIGITAL" | "FISICO") {
  const { salida, agencia } = await createDepartureFixture({ capacity: 20 });
  const metodo = await createPaymentMethodFixture({ kind, currency: "USD" });
  const cuenta = await createAccountFixture();
  const operador = await createPanelUserFixture({ agencyId: agencia.id });
  const otroOperador = await createPanelUserFixture({ agencyId: agencia.id });
  const reserva = await createReservation({
    accountId: cuenta.id,
    departureId: salida.id,
    paymentMethodId: metodo.id,
    companions: [],
    policiesAccepted: true,
  });
  return { agencia, metodo, cuenta, operador, otroOperador, reserva };
}

/** Suma de lo que dice el libro de pagos: efectivo cobrado más comprobantes aprobados. */
async function ledgerUsd(reservationId: string): Promise<Prisma.Decimal> {
  const [efectivo, comprobantes] = await Promise.all([
    prisma.cashPayment.aggregate({ where: { reservationId }, _sum: { amountUsd: true } }),
    prisma.paymentProof.aggregate({
      where: { reservationId, status: "APROBADO" },
      _sum: { amountUsd: true },
    }),
  ]);
  return (efectivo._sum.amountUsd ?? new Prisma.Decimal(0)).add(
    comprobantes._sum.amountUsd ?? new Prisma.Decimal(0),
  );
}

describe("pagos simultáneos sobre la misma reserva", () => {
  it("dos cobros en efectivo por el saldo completo dejan un solo pago y el otro falla con un aviso claro", async () => {
    const { agencia, operador, otroOperador, reserva } = await escenario("FISICO");

    const resultados = await Promise.allSettled(
      [operador, otroOperador].map((quien) =>
        registerCashPayment({
          reservationId: reserva.reservationId,
          panelUserId: quien.id,
          agencyId: agencia.id,
          amount: "47.50",
          currency: "USD",
        }),
      ),
    );

    const cumplidos = resultados.filter((r) => r.status === "fulfilled");
    const fallidos = resultados.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(cumplidos).toHaveLength(1);
    expect(fallidos).toHaveLength(1);
    expect(fallidos[0]?.reason).toBeInstanceOf(ValidationError);
    expect((fallidos[0]?.reason as Error).message).toBe(ALREADY_PAID_CASH_MESSAGE);

    const fila = await prisma.reservation.findUniqueOrThrow({
      where: { id: reserva.reservationId },
      include: { cashPayments: true },
    });
    expect(fila.status).toBe("PAGADA");
    expect(fila.cashPayments).toHaveLength(1);
    expect(fila.paidUsd.toString()).toBe("47.5");
  });

  it("dos abonos en efectivo simultáneos sobre una reserva abonada suman los dos", async () => {
    const { agencia, operador, otroOperador, reserva } = await escenario("DIGITAL");
    await registerCashPayment({
      reservationId: reserva.reservationId,
      panelUserId: operador.id,
      agencyId: agencia.id,
      amount: "10.00",
      currency: "USD",
    });

    await Promise.all(
      [operador, otroOperador].map((quien) =>
        registerCashPayment({
          reservationId: reserva.reservationId,
          panelUserId: quien.id,
          agencyId: agencia.id,
          amount: "10.00",
          currency: "USD",
        }),
      ),
    );

    const fila = await prisma.reservation.findUniqueOrThrow({
      where: { id: reserva.reservationId },
    });
    expect(fila.status).toBe("ABONADA");
    expect(fila.paidUsd.toString()).toBe("30");
    expect((await ledgerUsd(reserva.reservationId)).toString()).toBe("30");
  });

  it("aprobar un comprobante y cobrar un abono en efectivo a la vez suma los dos sin perder ninguno", async () => {
    const { agencia, metodo, cuenta, operador, otroOperador, reserva } = await escenario("DIGITAL");
    const { proofId } = await submitProof({
      reservationId: reserva.reservationId,
      accountId: cuenta.id,
      paymentMethodId: metodo.id,
      reference: "REF-CARRERA",
      amount: "20.00",
      currency: "USD",
      imagePath: "comprobantes/x/a.png",
    });

    await Promise.all([
      approveProof({ proofId, panelUserId: operador.id, agencyId: agencia.id }),
      registerCashPayment({
        reservationId: reserva.reservationId,
        panelUserId: otroOperador.id,
        agencyId: agencia.id,
        amount: "20.00",
        currency: "USD",
      }),
    ]);

    const fila = await prisma.reservation.findUniqueOrThrow({
      where: { id: reserva.reservationId },
    });
    expect(fila.status).toBe("ABONADA");
    expect(fila.paidUsd.toString()).toBe("40");
    expect((await ledgerUsd(reserva.reservationId)).toString()).toBe("40");
  });

  it("aprobar un comprobante por el total y cobrar el total en efectivo a la vez nunca deja el saldo descuadrado", async () => {
    const { agencia, metodo, cuenta, operador, otroOperador, reserva } = await escenario("DIGITAL");
    const { proofId } = await submitProof({
      reservationId: reserva.reservationId,
      accountId: cuenta.id,
      paymentMethodId: metodo.id,
      reference: "REF-TOTAL",
      amount: "47.50",
      currency: "USD",
      imagePath: "comprobantes/x/a.png",
    });

    const [aprobacion, cobro] = await Promise.allSettled([
      approveProof({ proofId, panelUserId: operador.id, agencyId: agencia.id }),
      registerCashPayment({
        reservationId: reserva.reservationId,
        panelUserId: otroOperador.id,
        agencyId: agencia.id,
        amount: "47.50",
        currency: "USD",
      }),
    ]);

    // La transferencia que el pasajero sí hizo siempre se aprueba.
    expect(aprobacion?.status).toBe("fulfilled");

    const fila = await prisma.reservation.findUniqueOrThrow({
      where: { id: reserva.reservationId },
      include: { cashPayments: true },
    });
    expect(fila.status).toBe("PAGADA");
    expect(fila.paidUsd.toString()).toBe((await ledgerUsd(reserva.reservationId)).toString());

    if (cobro?.status === "rejected") {
      // La aprobación llegó primero: el efectivo no se recibe y no supera el total.
      expect(cobro.reason).toBeInstanceOf(ValidationError);
      expect(fila.cashPayments).toHaveLength(0);
      expect(fila.paidUsd.toString()).toBe("47.5");
    } else {
      // El efectivo llegó primero: la aprobación registra el excedente, como ya hacía.
      expect(fila.cashPayments).toHaveLength(1);
      expect(fila.paidUsd.toString()).toBe("95");
      expect(
        await prisma.auditLog.count({
          where: { entityId: reserva.reservationId, action: "PAGO_EN_EXCESO" },
        }),
      ).toBe(1);
    }
  });

  it("dos aprobaciones simultáneas del mismo comprobante suman el abono una sola vez", async () => {
    const { agencia, metodo, cuenta, operador, otroOperador, reserva } = await escenario("DIGITAL");
    const { proofId } = await submitProof({
      reservationId: reserva.reservationId,
      accountId: cuenta.id,
      paymentMethodId: metodo.id,
      reference: "REF-DOBLE",
      amount: "20.00",
      currency: "USD",
      imagePath: "comprobantes/x/a.png",
    });

    await Promise.all(
      [operador, otroOperador].map((quien) =>
        approveProof({ proofId, panelUserId: quien.id, agencyId: agencia.id }),
      ),
    );

    const fila = await prisma.reservation.findUniqueOrThrow({
      where: { id: reserva.reservationId },
    });
    expect(fila.paidUsd.toString()).toBe("20");
    expect(
      await prisma.auditLog.count({ where: { entityId: proofId, action: "PAGO_APROBADO" } }),
    ).toBe(1);
  });
});
