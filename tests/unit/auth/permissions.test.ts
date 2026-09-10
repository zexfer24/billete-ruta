import { describe, expect, it } from "vitest";
import { ALL_PERMISSIONS, ForbiddenError, assertCan, can } from "@/modules/auth/permissions";

describe("matriz de permisos", () => {
  it("el admin del terminal supervisa y configura", () => {
    for (const permiso of [
      "terminal.dashboard",
      "terminal.users",
      "terminal.agencies",
      "terminal.rates",
      "terminal.messages",
      "agency.reports",
    ] as const) {
      expect(can("ADMIN", permiso)).toBe(true);
    }
  });

  it("el admin no vende ni cobra", () => {
    for (const permiso of [
      "payments.review",
      "payments.cash",
      "fleet.manage",
      "departures.manage",
      "boarding.manage",
      "trips.manage",
    ] as const) {
      expect(can("ADMIN", permiso)).toBe(false);
    }
  });

  it("el operador maneja la venta y la operación de su agencia", () => {
    for (const permiso of [
      "payments.review",
      "payments.cash",
      "fleet.manage",
      "departures.manage",
      "boarding.manage",
      "trips.manage",
      "agency.reports",
    ] as const) {
      expect(can("OPERADOR", permiso)).toBe(true);
    }
  });

  it("el operador no accede a nada del terminal", () => {
    for (const permiso of ALL_PERMISSIONS.filter((p) => p.startsWith("terminal."))) {
      expect(can("OPERADOR", permiso)).toBe(false);
    }
  });

  it("todo permiso declarado lo tiene al menos un rol", () => {
    for (const permiso of ALL_PERMISSIONS) {
      expect(can("ADMIN", permiso) || can("OPERADOR", permiso)).toBe(true);
    }
  });
});

describe("assertCan", () => {
  it("lanza nombrando rol y permiso", () => {
    expect(() => assertCan("OPERADOR", "terminal.users")).toThrow(ForbiddenError);
    expect(() => assertCan("OPERADOR", "terminal.users")).toThrow(/OPERADOR.*terminal\.users/);
  });

  it("no lanza cuando el permiso existe", () => {
    expect(() => assertCan("OPERADOR", "payments.review")).not.toThrow();
  });
});
