import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PanelSessionUser } from "@/modules/auth";
import {
  createAgencyFixture,
  createDepartureFixture,
  createDriverFixture,
  createPanelUserFixture,
  createRouteFixture,
  createVehicleFixture,
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

const { createDepartureAction, registerArrivalAction, registerDepartureAction, startBoardingAction } =
  await import("@/app/panel/salidas/actions");

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
  return { agencia, ruta, vehiculo, chofer, salida, operador };
}

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

describe("createDepartureAction", () => {
  it("datos inválidos sin origen reabren el panel lateral de salidas", async () => {
    const agencia = await createAgencyFixture();
    const operador = await createPanelUserFixture({ agencyId: agencia.id });
    currentUser = operatorSession(agencia.id, operador.id);

    const url = await captureRedirectUrl(
      createDepartureAction(buildFormData({ fecha: "2026-09-20", hora: "08:00" })),
    );

    expect(url.pathname).toBe("/panel/salidas");
    expect(url.searchParams.get("crear")).toBe("1");
    expect(url.searchParams.get("error")).toBeTruthy();
  });

  it("alta válida con origen=tablero vuelve al tablero", async () => {
    const agencia = await createAgencyFixture();
    const ruta = await createRouteFixture(agencia.id);
    const vehiculo = await createVehicleFixture(agencia.id, 40);
    const chofer = await createDriverFixture(agencia.id);
    const operador = await createPanelUserFixture({ agencyId: agencia.id });
    currentUser = operatorSession(agencia.id, operador.id);

    const url = await captureRedirectUrl(
      createDepartureAction(
        buildFormData({
          routeId: ruta.id,
          vehicleId: vehiculo.id,
          driverId: chofer.id,
          fecha: "2026-09-20",
          hora: "08:00",
          origen: "tablero",
        }),
      ),
    );

    expect(url.pathname).toBe("/panel");
    expect(url.searchParams.get("ok")).toBe("salida-creada");
  });

  it("datos inválidos con origen=tablero vuelven al tablero con el registro abierto", async () => {
    const agencia = await createAgencyFixture();
    const operador = await createPanelUserFixture({ agencyId: agencia.id });
    currentUser = operatorSession(agencia.id, operador.id);

    const url = await captureRedirectUrl(
      createDepartureAction(
        buildFormData({ fecha: "2026-09-20", hora: "08:00", origen: "tablero" }),
      ),
    );

    expect(url.pathname).toBe("/panel");
    expect(url.searchParams.get("registrar")).toBe("salida");
    expect(url.searchParams.get("error")).toBeTruthy();
  });
});
