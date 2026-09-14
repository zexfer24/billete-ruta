import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import type { PanelSessionUser } from "@/modules/auth";
import { createDepartureFixture, createPanelUserFixture, seedRatesFixture } from "../fixtures";
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
  return { agencia, ruta, vehiculo, chofer, salida, operador };
}

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
