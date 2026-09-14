import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PanelRole } from "@prisma/client";
import type { PanelSessionUser } from "@/modules/auth/sessions";

const PANEL_COOKIE = "tr_panel";

/** Señal que reemplaza el `NEXT_REDIRECT` real de Next.js, para poder afirmar el destino. */
class RedirectSignal extends Error {
  constructor(public readonly url: string) {
    super(`NEXT_REDIRECT:${url}`);
  }
}

const resolvePanelSession = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (name === PANEL_COOKIE ? { value: "token-de-prueba" } : undefined),
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectSignal(url);
  }),
}));

vi.mock("@/modules/auth/sessions", () => ({
  PANEL_COOKIE,
  resolvePanelSession,
}));

const { requireAgencyUser, requirePanelUser } = await import("@/modules/auth/guards");

beforeEach(() => {
  resolvePanelSession.mockReset();
});

function buildUser(overrides: Partial<PanelSessionUser> & { role: PanelRole }): PanelSessionUser {
  return {
    id: "usuario-1",
    email: "usuario@ejemplo.com",
    name: "Usuario de prueba",
    agencyId: null,
    agencyName: null,
    ...overrides,
  };
}

/** Corre la promesa y devuelve la URL de la redirección, o falla si no redirige. */
async function captureRedirectUrl(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof RedirectSignal) return error.url;
    throw error;
  }
  throw new Error("se esperaba una redirección y no ocurrió ninguna");
}

describe("requirePanelUser", () => {
  it("sin sesión redirige al acceso del panel", async () => {
    resolvePanelSession.mockResolvedValue(null);
    const url = await captureRedirectUrl(requirePanelUser("agency.reports"));
    expect(url).toBe("/panel/ingresar");
  });

  it("el admin sin el permiso exigido va a su tablero", async () => {
    resolvePanelSession.mockResolvedValue(buildUser({ role: "ADMIN" }));
    const url = await captureRedirectUrl(requirePanelUser("payments.review"));
    expect(url).toBe("/panel/admin/tablero");
  });

  it("el operador sin el permiso exigido va al inicio del panel", async () => {
    resolvePanelSession.mockResolvedValue(buildUser({ role: "OPERADOR", agencyId: "agencia-1" }));
    const url = await captureRedirectUrl(requirePanelUser("terminal.dashboard"));
    expect(url).toBe("/panel");
  });

  it("con el permiso, devuelve el usuario de la sesión", async () => {
    const usuario = buildUser({ role: "OPERADOR", agencyId: "agencia-1" });
    resolvePanelSession.mockResolvedValue(usuario);
    await expect(requirePanelUser("payments.review")).resolves.toEqual(usuario);
  });
});

describe("requireAgencyUser", () => {
  it("con el admin, redirige a su propio inicio", async () => {
    resolvePanelSession.mockResolvedValue(buildUser({ role: "ADMIN" }));
    const url = await captureRedirectUrl(requireAgencyUser("agency.reports"));
    expect(url).toBe("/panel/admin/tablero");
  });

  it("con el operador, devuelve el usuario y su agencia", async () => {
    const usuario = buildUser({ role: "OPERADOR", agencyId: "agencia-1", agencyName: "Agencia Uno" });
    resolvePanelSession.mockResolvedValue(usuario);
    await expect(requireAgencyUser("payments.review")).resolves.toEqual({
      user: usuario,
      agencyId: "agencia-1",
    });
  });

  it("con el operador sin agencia asignada, lanza un error de configuración", async () => {
    resolvePanelSession.mockResolvedValue(buildUser({ role: "OPERADOR", agencyId: null }));
    await expect(requireAgencyUser("payments.review")).rejects.toThrow(
      "El operador no tiene agencia asignada",
    );
  });
});
