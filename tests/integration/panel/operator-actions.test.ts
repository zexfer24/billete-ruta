import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import type { PanelSessionUser } from "@/modules/auth";
import { createReservation } from "@/modules/booking";
import { rejectProof, submitProof } from "@/modules/payments";
import {
  createAccountFixture,
  createDepartureFixture,
  createPanelUserFixture,
  createPaymentMethodFixture,
  seedRatesFixture,
} from "../fixtures";
import { disconnect, resetDatabase } from "../setup";

/** Señal que reemplaza el `NEXT_REDIRECT` real de Next.js, para poder afirmar el destino. */
class RedirectSignal extends Error {
  constructor(public readonly url: string) {
    super(`NEXT_REDIRECT:${url}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectSignal(url);
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

let currentUser: PanelSessionUser | null = null;

vi.mock("@/modules/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/auth")>();
  return {
    ...actual,
    requirePanelUser: vi.fn(async () => {
      if (!currentUser) throw new Error("Configura currentUser antes de llamar a la acción.");
      return currentUser;
    }),
  };
});

const { approveProofAction, cashPaymentAction, rejectProofAction } = await import(
  "@/app/panel/pagos/actions"
);
const { registerArrivalAction, registerDepartureAction, startBoardingAction } = await import(
  "@/app/panel/salidas/actions"
);
const { createDriverAction, createVehicleAction } = await import("@/app/panel/flota/actions");

beforeEach(async () => {
  await resetDatabase();
  await seedRatesFixture();
  currentUser = null;
});
afterAll(disconnect);

function operatorSession(agencyId: string, id: string): PanelSessionUser {
  return {
    id,
    email: "operador@test.local",
    name: "Operador de prueba",
    role: "OPERADOR",
    agencyId,
    agencyName: "Agencia de prueba",
  };
}

function buildFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

/** Corre la acción y devuelve la URL de la redirección (de éxito o de error). */
async function captureRedirectUrl(promise: Promise<unknown>): Promise<URL> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof RedirectSignal) return new URL(error.url, "http://x");
    throw error;
  }
  throw new Error("se esperaba una redirección y no ocurrió ninguna");
}

async function escenario(capacity = 20) {
  const { agencia, ruta, vehiculo, chofer, salida } = await createDepartureFixture({ capacity });
  const operador = await createPanelUserFixture({ agencyId: agencia.id });
  const digital = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
  const fisico = await createPaymentMethodFixture({ kind: "FISICO", currency: "USD" });
  return { agencia, ruta, vehiculo, chofer, salida, operador, digital, fisico };
}

describe("cashPaymentAction", () => {
  it("un serial inexistente da error y no crea ningún cobro", async () => {
    const { agencia, operador } = await escenario();
    currentUser = operatorSession(agencia.id, operador.id);

    const url = await captureRedirectUrl(
      cashPaymentAction(
        buildFormData({ code: "TR-INEXISTENTE", amount: "47.50", currency: "USD", pagina: "1" }),
      ),
    );

    expect(url.searchParams.get("error")).toBeTruthy();
    expect(await prisma.cashPayment.count()).toBe(0);
  });

  it("un monto no numérico da error", async () => {
    const { agencia, operador, fisico, salida } = await escenario();
    const cuenta = await createAccountFixture();
    const reserva = await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: fisico.id,
      companions: [],
      policiesAccepted: true,
    });
    currentUser = operatorSession(agencia.id, operador.id);

    const url = await captureRedirectUrl(
      cashPaymentAction(
        buildFormData({ code: reserva.code, amount: "abc", currency: "USD", pagina: "1" }),
      ),
    );

    expect(url.searchParams.get("error")).toBeTruthy();
    expect(await prisma.cashPayment.count()).toBe(0);
  });

  it("un monto con coma que cubre el saldo salda la reserva y emite el ticket", async () => {
    const { agencia, operador, fisico, salida } = await escenario();
    const cuenta = await createAccountFixture();
    // Reserva de un solo pasajero: 45,00 de tarifa + 2,50 de tasa = 47,50 USD.
    const reserva = await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: fisico.id,
      companions: [],
      policiesAccepted: true,
    });
    currentUser = operatorSession(agencia.id, operador.id);

    const url = await captureRedirectUrl(
      cashPaymentAction(
        buildFormData({ code: reserva.code, amount: "47,50", currency: "USD", pagina: "1" }),
      ),
    );

    expect(url.searchParams.get("ok")).toBe("cobro-ticket");
    const fila = await prisma.reservation.findUniqueOrThrow({
      where: { id: reserva.reservationId },
    });
    expect(fila.status).toBe("PAGADA");
    const ticket = await prisma.ticket.findUnique({
      where: { reservationId: reserva.reservationId },
    });
    expect(ticket).not.toBeNull();
  });
});

describe("rejectProofAction y approveProofAction", () => {
  it("un motivo de rechazo de 2 letras da error", async () => {
    const { agencia, operador, digital, salida } = await escenario();
    const cuenta = await createAccountFixture();
    const reserva = await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: digital.id,
      companions: [],
      policiesAccepted: true,
    });
    const { proofId } = await submitProof({
      reservationId: reserva.reservationId,
      accountId: cuenta.id,
      paymentMethodId: digital.id,
      reference: "REF-0001",
      amount: "47.50",
      currency: "USD",
      imagePath: "comprobantes/x/a.png",
    });
    currentUser = operatorSession(agencia.id, operador.id);

    const url = await captureRedirectUrl(
      rejectProofAction(buildFormData({ proofId, reason: "no", pagina: "1" })),
    );

    expect(url.searchParams.get("error")).toBeTruthy();
    const proof = await prisma.paymentProof.findUniqueOrThrow({ where: { id: proofId } });
    expect(proof.status).toBe("PENDIENTE");
  });

  it("aprobar un comprobante ya rechazado da error", async () => {
    const { agencia, operador, digital, salida } = await escenario();
    const cuenta = await createAccountFixture();
    const reserva = await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: digital.id,
      companions: [],
      policiesAccepted: true,
    });
    const { proofId } = await submitProof({
      reservationId: reserva.reservationId,
      accountId: cuenta.id,
      paymentMethodId: digital.id,
      reference: "REF-0002",
      amount: "47.50",
      currency: "USD",
      imagePath: "comprobantes/x/a.png",
    });
    await rejectProof({
      proofId,
      panelUserId: operador.id,
      agencyId: agencia.id,
      reason: "Comprobante ilegible",
    });
    currentUser = operatorSession(agencia.id, operador.id);

    const url = await captureRedirectUrl(
      approveProofAction(buildFormData({ proofId, pagina: "1" })),
    );

    expect(url.searchParams.get("error")).toBe("Este comprobante ya fue rechazado.");
  });
});

describe("acciones de salidas", () => {
  it("registrar la llegada antes de la salida da error y vuelve al manifiesto", async () => {
    const { agencia, operador, salida } = await escenario();
    currentUser = operatorSession(agencia.id, operador.id);

    await captureRedirectUrl(startBoardingAction(buildFormData({ departureId: salida.id })));

    const url = await captureRedirectUrl(
      registerArrivalAction(buildFormData({ departureId: salida.id })),
    );

    expect(url.pathname).toBe(`/panel/salidas/${salida.id}`);
    expect(url.searchParams.get("error")).toBeTruthy();
  });

  it("registrar la salida dos veces da error la segunda vez", async () => {
    const { agencia, operador, salida } = await escenario();
    currentUser = operatorSession(agencia.id, operador.id);

    await captureRedirectUrl(startBoardingAction(buildFormData({ departureId: salida.id })));
    await captureRedirectUrl(registerDepartureAction(buildFormData({ departureId: salida.id })));

    const url = await captureRedirectUrl(
      registerDepartureAction(buildFormData({ departureId: salida.id })),
    );

    expect(url.searchParams.get("error")).toBeTruthy();
  });
});

describe("acciones de flota", () => {
  it("una placa demasiado corta da error", async () => {
    const { agencia, operador } = await escenario();
    currentUser = operatorSession(agencia.id, operador.id);

    const url = await captureRedirectUrl(
      createVehicleAction(
        buildFormData({ plate: "AB", brand: "Marca", model: "Modelo", seatCount: "40" }),
      ),
    );

    expect(url.searchParams.get("error")).toBeTruthy();
    expect(await prisma.vehicle.findFirst({ where: { plate: "AB" } })).toBeNull();
  });

  it("una placa duplicada da error", async () => {
    const { agencia, operador, vehiculo } = await escenario();
    currentUser = operatorSession(agencia.id, operador.id);

    const url = await captureRedirectUrl(
      createVehicleAction(
        buildFormData({ plate: vehiculo.plate, brand: "Otra", model: "Otro", seatCount: "40" }),
      ),
    );

    expect(url.searchParams.get("error")).toBeTruthy();
    expect(await prisma.vehicle.count({ where: { agencyId: agencia.id } })).toBe(1);
  });

  it("una cédula de chofer inválida da error", async () => {
    const { agencia, operador } = await escenario();
    currentUser = operatorSession(agencia.id, operador.id);

    const url = await captureRedirectUrl(
      createDriverAction(
        buildFormData({
          fullName: "Chofer de prueba",
          idNumber: "no-es-cedula",
          phone: "+584160000000",
        }),
      ),
    );

    expect(url.searchParams.get("error")).toBeTruthy();
  });
});
