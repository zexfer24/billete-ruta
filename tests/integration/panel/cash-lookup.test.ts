import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, type PanelSessionUser } from "@/modules/auth";
import { createReservation } from "@/modules/booking";
import { CASH_LOOKUP_EMPTY, CASH_LOOKUP_NOT_FOUND } from "@/app/panel/_forms/cash-lookup-text";
import {
  createAccountFixture,
  createAgencyFixture,
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

const { findCashReservationAction } = await import("@/app/panel/_forms/cash-lookup-action");

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

/** Agencia con un operador en sesión y una reserva de pago en taquilla (por cobrar). */
async function escenario() {
  const { agencia, salida } = await createDepartureFixture({ capacity: 20 });
  const operador = await createPanelUserFixture({ agencyId: agencia.id });
  const fisico = await createPaymentMethodFixture({ kind: "FISICO", currency: "USD" });
  const cuenta = await createAccountFixture();
  const { reservationId } = await createReservation({
    accountId: cuenta.id,
    departureId: salida.id,
    paymentMethodId: fisico.id,
    companions: [],
    policiesAccepted: true,
  });
  const reserva = await prisma.reservation.findUniqueOrThrow({ where: { id: reservationId } });
  currentUser = operatorSession(agencia.id, operador.id);
  return { agencia, salida, fisico, cuenta, reserva };
}

describe("findCashReservationAction", () => {
  it("un código con espacios alrededor y en minúsculas abre el detalle de la reserva", async () => {
    const { reserva } = await escenario();

    const url = await captureRedirectUrl(
      findCashReservationAction(buildFormData({ code: `  ${reserva.code.toLowerCase()}  ` })),
    );

    expect(url.pathname).toBe("/panel/pasajeros");
    expect(url.searchParams.get("reserva")).toBe(reserva.id);
    expect(url.searchParams.get("error")).toBeNull();
    expect(url.searchParams.get("registrar")).toBeNull();
  });

  it("al abrir el detalle conserva la vista, la página, la salida y la búsqueda de origen", async () => {
    const { reserva, salida } = await escenario();

    const url = await captureRedirectUrl(
      findCashReservationAction(
        buildFormData({ code: reserva.code, vista: "por-cobrar", pagina: "2", salida: salida.id, buscar: "Pérez" }),
      ),
    );

    expect(url.pathname).toBe("/panel/pasajeros");
    expect(url.searchParams.get("reserva")).toBe(reserva.id);
    expect(url.searchParams.get("vista")).toBe("por-cobrar");
    expect(url.searchParams.get("pagina")).toBe("2");
    expect(url.searchParams.get("salida")).toBe(salida.id);
    expect(url.searchParams.get("buscar")).toBe("Pérez");
  });

  it("un texto de menos de 4 caracteres pide el código, con el panel de cobro abierto", async () => {
    await escenario();

    const url = await captureRedirectUrl(findCashReservationAction(buildFormData({ code: " TR1 " })));

    expect(url.pathname).toBe("/panel/pasajeros");
    expect(url.searchParams.get("registrar")).toBe("cobro");
    expect(url.searchParams.get("error")).toBe(CASH_LOOKUP_EMPTY);
  });

  it("un código inexistente da el aviso de no encontrada y conserva el contexto", async () => {
    const { salida } = await escenario();

    const url = await captureRedirectUrl(
      findCashReservationAction(
        buildFormData({ code: "TR-0000-1PAX-NADA", vista: "todas", pagina: "3", salida: salida.id, buscar: "Ana" }),
      ),
    );

    expect(url.pathname).toBe("/panel/pasajeros");
    expect(url.searchParams.get("registrar")).toBe("cobro");
    expect(url.searchParams.get("error")).toBe(CASH_LOOKUP_NOT_FOUND);
    expect(url.searchParams.get("reserva")).toBeNull();
    expect(url.searchParams.get("vista")).toBe("todas");
    expect(url.searchParams.get("pagina")).toBe("3");
    expect(url.searchParams.get("salida")).toBe(salida.id);
    expect(url.searchParams.get("buscar")).toBe("Ana");
  });

  it("una reserva de otra agencia da exactamente el mismo aviso que una inexistente y no deja ver su id", async () => {
    const { reserva } = await escenario();
    const otraAgencia = await createAgencyFixture();
    const intruso = await createPanelUserFixture({ agencyId: otraAgencia.id });
    currentUser = operatorSession(otraAgencia.id, intruso.id);

    const urlAjena = await captureRedirectUrl(findCashReservationAction(buildFormData({ code: reserva.code })));
    const urlInexistente = await captureRedirectUrl(
      findCashReservationAction(buildFormData({ code: "TR-0000-1PAX-NADA" })),
    );

    expect(urlAjena.toString()).toBe(urlInexistente.toString());
    expect(urlAjena.searchParams.get("error")).toBe(CASH_LOOKUP_NOT_FOUND);
    expect(urlAjena.searchParams.get("reserva")).toBeNull();
    expect(urlAjena.toString()).not.toContain(reserva.id);
  });

  it("con origen=tablero los errores vuelven al tablero con el cobro abierto y sin el contexto de la lista", async () => {
    await escenario();

    const corto = await captureRedirectUrl(
      findCashReservationAction(buildFormData({ code: "ab", origen: "tablero", vista: "todas", buscar: "Ana" })),
    );
    const inexistente = await captureRedirectUrl(
      findCashReservationAction(
        buildFormData({ code: "TR-0000-1PAX-NADA", origen: "tablero", vista: "todas", pagina: "2", buscar: "Ana" }),
      ),
    );

    for (const [url, error] of [
      [corto, CASH_LOOKUP_EMPTY],
      [inexistente, CASH_LOOKUP_NOT_FOUND],
    ] as const) {
      expect(url.pathname).toBe("/panel");
      expect(url.searchParams.get("registrar")).toBe("cobro");
      expect(url.searchParams.get("error")).toBe(error);
      for (const clave of ["vista", "pagina", "salida", "buscar"]) {
        expect(url.searchParams.get(clave)).toBeNull();
      }
    }
  });

  it("con origen=tablero y un código válido abre el detalle en Pasajeros y pagos", async () => {
    const { reserva } = await escenario();

    const url = await captureRedirectUrl(
      findCashReservationAction(buildFormData({ code: reserva.code, origen: "tablero" })),
    );

    expect(url.pathname).toBe("/panel/pasajeros");
    expect(url.searchParams.get("reserva")).toBe(reserva.id);
  });

  it("la cédula de un titular con una sola reserva por cobrar abre esa reserva", async () => {
    const { reserva, cuenta } = await escenario();
    const soloNumeros = cuenta.idNumber.replace(/^V/, "");

    const url = await captureRedirectUrl(findCashReservationAction(buildFormData({ code: soloNumeros })));

    expect(url.pathname).toBe("/panel/pasajeros");
    expect(url.searchParams.get("reserva")).toBe(reserva.id);
  });

  it("la cédula de un titular con varias reservas por cobrar abre la lista por cobrar filtrada por esa cédula", async () => {
    const { agencia, fisico, cuenta } = await escenario();
    const otraSalida = await createDepartureFixture({ agencyId: agencia.id, capacity: 20 });
    await createReservation({
      accountId: cuenta.id,
      departureId: otraSalida.salida.id,
      paymentMethodId: fisico.id,
      companions: [],
      policiesAccepted: true,
    });

    const url = await captureRedirectUrl(findCashReservationAction(buildFormData({ code: cuenta.idNumber })));

    expect(url.pathname).toBe("/panel/pasajeros");
    expect(url.searchParams.get("vista")).toBe("por-cobrar");
    expect(url.searchParams.get("buscar")).toBe(cuenta.idNumber);
    expect(url.searchParams.get("reserva")).toBeNull();
  });

  it("la cédula de un titular de otra agencia no abre su reserva", async () => {
    const { cuenta, reserva } = await escenario();
    const otraAgencia = await createAgencyFixture();
    const intruso = await createPanelUserFixture({ agencyId: otraAgencia.id });
    currentUser = operatorSession(otraAgencia.id, intruso.id);

    const url = await captureRedirectUrl(findCashReservationAction(buildFormData({ code: cuenta.idNumber })));

    expect(url.searchParams.get("reserva")).toBeNull();
    expect(url.toString()).not.toContain(reserva.id);
  });

  it("ninguna búsqueda registra un cobro", async () => {
    const { reserva } = await escenario();
    await captureRedirectUrl(findCashReservationAction(buildFormData({ code: reserva.code })));
    await captureRedirectUrl(findCashReservationAction(buildFormData({ code: "TR-0000-1PAX-NADA" })));
    expect(await prisma.cashPayment.count()).toBe(0);
  });

  it("una sesión de administrador, sin agencia, no puede buscar", async () => {
    const { reserva } = await escenario();
    const admin = await createPanelUserFixture({ role: "ADMIN" });
    currentUser = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: "ADMIN",
      agencyId: null,
      agencyName: null,
    };

    await expect(findCashReservationAction(buildFormData({ code: reserva.code }))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
