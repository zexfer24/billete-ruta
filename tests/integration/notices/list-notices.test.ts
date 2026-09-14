import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { listNoticesForAccount } from "@/modules/notices";
import {
  createAccountFixture,
  createDepartureFixture,
  createPaymentMethodFixture,
} from "../fixtures";
import { disconnect, resetDatabase } from "../setup";

beforeEach(resetDatabase);
afterAll(disconnect);

describe("listNoticesForAccount", () => {
  it("avisa el documento faltante y la reserva por liberar", async () => {
    const cuenta = await createAccountFixture({ withCedula: false });
    const { salida } = await createDepartureFixture({ hoursFromNow: 72 });
    const metodo = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });

    await prisma.reservation.create({
      data: {
        code: "TR-0913-1PAX-ZZZZ",
        publicToken: "tok-list-notices",
        accountId: cuenta.id,
        departureId: salida.id,
        paymentMethodId: metodo.id,
        status: "PENDIENTE_PAGO",
        passengerCount: 1,
        policiesAcceptedAt: new Date(),
        fareUsd: "45.00",
        fareTotalUsd: "45.00",
        taxPerPassengerUsd: "2.50",
        taxTotalUsd: "2.50",
        totalUsd: "47.50",
        currency: "USD",
        exchangeRateUsed: "1",
        amountInCurrency: "47.50",
        expiresAt: new Date(Date.now() + 60 * 60_000),
      },
    });

    const avisos = await listNoticesForAccount(cuenta.id);

    expect(avisos.map((a) => a.kind)).toEqual(["DOCUMENTO_FALTANTE", "RESERVA_POR_LIBERAR"]);
    expect(avisos[1]?.reservationCode).toBe("TR-0913-1PAX-ZZZZ");
  });

  it("no avisa nada para una cuenta con documento y sin reservas activas", async () => {
    const cuenta = await createAccountFixture({ withCedula: true });
    expect(await listNoticesForAccount(cuenta.id)).toEqual([]);
  });
});
