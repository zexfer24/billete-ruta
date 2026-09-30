import { describe, expect, it } from "vitest";
import {
  caracasDayHeading,
  departureWhenText,
  groupByCaracasDay,
  plural,
} from "@/app/panel/_shared/day-label";

// Miércoles 30/09/2026 a las 10:00 en Caracas (UTC-4).
const NOW = new Date("2026-09-30T14:00:00Z");

describe("caracasDayHeading", () => {
  it("dice Hoy, Mañana y Ayer según el día de Caracas", () => {
    expect(caracasDayHeading(new Date("2026-09-30T22:00:00Z"), NOW)).toBe("Hoy");
    expect(caracasDayHeading(new Date("2026-10-01T12:00:00Z"), NOW)).toBe("Mañana");
    expect(caracasDayHeading(new Date("2026-09-29T12:00:00Z"), NOW)).toBe("Ayer");
  });

  it("usa el día de Caracas y no el de UTC cerca de la medianoche", () => {
    // 01/10 a las 02:00 UTC son todavía las 22:00 del 30/09 en Caracas.
    expect(caracasDayHeading(new Date("2026-10-01T02:00:00Z"), NOW)).toBe("Hoy");
  });

  it("fuera de esos tres días, nombra el día de la semana y la fecha", () => {
    expect(caracasDayHeading(new Date("2026-10-02T12:00:00Z"), NOW)).toBe("Viernes 02/10");
    expect(caracasDayHeading(new Date("2026-09-27T12:00:00Z"), NOW)).toBe("Domingo 27/09");
  });

  it("agrega el año si es otro", () => {
    expect(caracasDayHeading(new Date("2027-01-04T12:00:00Z"), NOW)).toBe("Lunes 04/01/2027");
  });
});

describe("departureWhenText", () => {
  it("arma la frase con el día y la hora de 24 horas", () => {
    expect(departureWhenText(new Date("2026-09-30T18:30:00Z"), NOW)).toBe("hoy a las 14:30");
    expect(departureWhenText(new Date("2026-10-01T10:00:00Z"), NOW)).toBe("mañana a las 06:00");
    expect(departureWhenText(new Date("2026-10-02T23:15:00Z"), NOW)).toBe("el viernes 02/10 a las 19:15");
  });

  it("dice «a la» para la una", () => {
    expect(departureWhenText(new Date("2026-10-01T05:10:00Z"), NOW)).toBe("mañana a la 01:10");
  });
});

describe("groupByCaracasDay", () => {
  it("agrupa elementos consecutivos del mismo día y conserva el orden", () => {
    const items = [
      { id: "a", at: new Date("2026-09-30T15:00:00Z") },
      { id: "b", at: new Date("2026-09-30T23:00:00Z") },
      { id: "c", at: new Date("2026-10-01T11:00:00Z") },
    ];
    const grupos = groupByCaracasDay(items, (i) => i.at, NOW);
    expect(grupos.map((g) => [g.heading, g.items.map((i) => i.id)])).toEqual([
      ["Hoy", ["a", "b"]],
      ["Mañana", ["c"]],
    ]);
  });

  it("sin elementos devuelve una lista vacía", () => {
    expect(groupByCaracasDay([], () => NOW, NOW)).toEqual([]);
  });
});

describe("plural", () => {
  it("usa el singular solo con 1", () => {
    expect(plural(1, "reserva", "reservas")).toBe("1 reserva");
    expect(plural(0, "reserva", "reservas")).toBe("0 reservas");
    expect(plural(3, "reserva", "reservas")).toBe("3 reservas");
  });
});
