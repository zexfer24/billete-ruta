import { describe, expect, it } from "vitest";
import {
  caracasDayKey,
  listDepartureDays,
  orderDayDepartures,
  pickDay,
} from "@/app/mi/reservar/departure-days";

// Miércoles 30 de septiembre de 2026, 10:00 en Caracas.
const AHORA = new Date("2026-09-30T14:00:00.000Z");

function salida(id: string, iso: string, available = 10) {
  return { id, departsAtIso: iso, available };
}

describe("días del paso 1 de la reserva", () => {
  it("usa el día de Caracas, no el de UTC", () => {
    // 23:30 del 30 en Caracas ya es 1 de octubre en UTC.
    expect(caracasDayKey(new Date("2026-10-01T03:30:00.000Z"))).toBe("2026-09-30");
  });

  it("arma las pastillas solo con los días que tienen salidas, en orden y con su contador", () => {
    const dias = listDepartureDays(
      [
        salida("c", "2026-10-02T11:00:00.000Z"),
        salida("a", "2026-09-30T18:00:00.000Z"),
        salida("b", "2026-10-01T10:00:00.000Z"),
        salida("d", "2026-10-02T20:00:00.000Z"),
      ],
      AHORA,
    );
    expect(dias.map((d) => [d.key, d.label, d.count])).toEqual([
      ["2026-09-30", "Hoy", 1],
      ["2026-10-01", "Mañana", 1],
      ["2026-10-02", "Vie 2", 2],
    ]);
    expect(dias.map((d) => d.heading)).toEqual([
      "Hoy, miércoles 30 de septiembre",
      "Mañana, jueves 1 de octubre",
      "Viernes 2 de octubre",
    ]);
  });

  it("elige el día pedido si tiene salidas y, si no, el primero", () => {
    const dias = listDepartureDays(
      [salida("a", "2026-10-01T10:00:00.000Z"), salida("b", "2026-10-03T10:00:00.000Z")],
      AHORA,
    );
    expect(pickDay(dias, "2026-10-03")).toBe("2026-10-03");
    expect(pickDay(dias, "2026-09-30")).toBe("2026-10-01");
    expect(pickDay(dias, undefined)).toBe("2026-10-01");
    expect(pickDay([], "2026-10-01")).toBeNull();
  });

  it("pone arriba las que salen en menos de una hora y al final de cada grupo las llenas", () => {
    const { pronto, resto } = orderDayDepartures(
      [
        salida("llena-tarde", "2026-09-30T17:00:00.000Z", 0),
        salida("tarde", "2026-09-30T19:00:00.000Z"),
        salida("pronto", "2026-09-30T14:30:00.000Z"),
        salida("temprano", "2026-09-30T16:00:00.000Z"),
      ],
      AHORA,
    );
    expect(pronto.map((d) => d.id)).toEqual(["pronto"]);
    expect(resto.map((d) => d.id)).toEqual(["temprano", "tarde", "llena-tarde"]);
  });
});
