import { describe, expect, it } from "vitest";
import { RESERVATION_CODE_PATTERN, generateReservationCode } from "@/modules/booking";

describe("generateReservationCode", () => {
  it("usa mes y día de la salida en hora de Caracas", () => {
    // 2026-08-16T02:00:00Z son las 22:00 del 15 de agosto en Caracas.
    expect(generateReservationCode(new Date("2026-08-16T02:00:00Z"), 4)).toMatch(
      /^TR-0815-4PAX-/,
    );
  });

  it("cumple el patrón del serial", () => {
    expect(
      RESERVATION_CODE_PATTERN.test(generateReservationCode(new Date("2026-12-01T16:00:00Z"), 1)),
    ).toBe(true);
  });

  it("excluye caracteres ambiguos del sufijo", () => {
    for (let i = 0; i < 300; i += 1) {
      const sufijo = generateReservationCode(new Date("2026-12-01T16:00:00Z"), 2).slice(-4);
      expect(sufijo).not.toMatch(/[01OI]/);
    }
  });

  it("rechaza cantidades fuera de 1 a 6", () => {
    expect(() => generateReservationCode(new Date(), 0)).toThrow(/entre 1 y 6/);
    expect(() => generateReservationCode(new Date(), 7)).toThrow(/entre 1 y 6/);
    expect(() => generateReservationCode(new Date(), 2.5)).toThrow(/entre 1 y 6/);
  });

  it("genera seriales distintos en llamadas sucesivas", () => {
    const codigos = new Set(
      Array.from({ length: 50 }, () =>
        generateReservationCode(new Date("2026-12-01T16:00:00Z"), 3),
      ),
    );
    expect(codigos.size).toBeGreaterThan(45);
  });
});
