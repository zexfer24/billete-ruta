import { describe, expect, it } from "vitest";
import {
  departureDayLabel,
  departureUrgencyLabel,
  departureWhenLabel,
  tripDurationLabel,
  formatFareUsd,
  seatsLabel,
  seatsLevel,
} from "@/components/departure-format";

// Caracas está en UTC-4: 16:00Z son las 12:00 en Caracas.
const now = new Date("2026-09-30T16:00:00Z");
const minutos = (n: number) => new Date(now.getTime() + n * 60_000);

describe("seatsLabel y seatsLevel", () => {
  it("dice los puestos en singular o plural, sin paréntesis", () => {
    expect(seatsLabel(0)).toBe("Sin puestos");
    expect(seatsLabel(-2)).toBe("Sin puestos");
    expect(seatsLabel(1)).toBe("Queda 1 puesto");
    expect(seatsLabel(3)).toBe("Quedan 3 puestos");
    expect(seatsLabel(4)).toBe("4 puestos libres");
    expect(seatsLabel(40)).toBe("40 puestos libres");
  });

  it("marca como pocos los puestos de 1 a 3", () => {
    expect(seatsLevel(0)).toBe("agotado");
    expect(seatsLevel(1)).toBe("pocos");
    expect(seatsLevel(3)).toBe("pocos");
    expect(seatsLevel(4)).toBe("normal");
  });
});

describe("formatFareUsd", () => {
  it("usa coma decimal y punto de miles", () => {
    expect(formatFareUsd("25")).toBe("$ 25,00");
    expect(formatFareUsd("1234.5")).toBe("$ 1.234,50");
  });

  it("no inventa un número si el texto no es un monto", () => {
    expect(formatFareUsd("abc")).toBe("$ abc");
  });
});

describe("departureUrgencyLabel", () => {
  it("rotula con 'Sale en' solo si falta menos de una hora", () => {
    expect(departureUrgencyLabel(minutos(15), now)).toBe("Sale en 15 min");
    expect(departureUrgencyLabel(minutos(59), now)).toBe("Sale en 59 min");
    expect(departureUrgencyLabel(new Date(now.getTime() + 30_000), now)).toBe("Sale ahora");
  });

  it("no repite la hora cuando falta una hora o más", () => {
    expect(departureUrgencyLabel(minutos(60), now)).toBeNull();
    expect(departureUrgencyLabel(minutos(300), now)).toBeNull();
  });

  it("dice 'Salió' si la hora ya pasó, nunca un número negativo", () => {
    expect(departureUrgencyLabel(minutos(-5), now)).toBe("Salió");
  });
});

describe("departureDayLabel", () => {
  it("no agrega nada si sale hoy en Caracas", () => {
    expect(departureDayLabel(minutos(60), now)).toBeNull();
  });

  it("dice 'Mañana' si sale al día siguiente en Caracas", () => {
    // 04:30Z del 1 de octubre son las 00:30 del 1 de octubre en Caracas.
    expect(departureDayLabel(new Date("2026-10-01T04:30:00Z"), now)).toBe("Mañana");
  });

  it("muestra el día de la semana, el día y el mes para fechas más lejanas", () => {
    expect(departureDayLabel(new Date("2026-10-03T16:00:00Z"), now)).toBe("Sáb 3 oct");
  });
});

describe("departureWhenLabel", () => {
  it("usa el rótulo relativo cuando falta menos de una hora", () => {
    expect(departureWhenLabel(minutos(15), now)).toBe("Sale en 15 min");
    expect(departureWhenLabel(new Date(now.getTime() + 30_000), now)).toBe("Sale ahora");
    expect(departureWhenLabel(minutos(-5), now)).toBe("Salió");
  });

  it("dice solo la hora si sale hoy en Caracas", () => {
    expect(departureWhenLabel(minutos(60), now)).toBe("Sale a las 13:00");
    // 03:30Z del 1 de octubre son todavía las 23:30 del 30 de septiembre en Caracas.
    expect(departureWhenLabel(new Date("2026-10-01T03:30:00Z"), now)).toBe("Sale a las 23:30");
  });

  it("dice 'Mañana a las' si sale al día siguiente en Caracas", () => {
    // 04:30Z del 1 de octubre son las 00:30 del 1 de octubre en Caracas.
    expect(departureWhenLabel(new Date("2026-10-01T04:30:00Z"), now)).toBe("Mañana a las 00:30");
    expect(departureWhenLabel(new Date("2026-10-01T11:00:00Z"), now)).toBe("Mañana a las 07:00");
  });

  it("dice el día de la semana, el día y el mes para otros días", () => {
    expect(departureWhenLabel(new Date("2026-10-03T16:00:00Z"), now)).toBe("Sáb 3 oct a las 12:00");
  });

  it("con el día en el título del grupo, dice solo la hora", () => {
    expect(departureWhenLabel(new Date("2026-10-03T16:00:00Z"), now, { dayInHeading: true })).toBe(
      "Sale a las 12:00",
    );
    expect(departureWhenLabel(minutos(15), now, { dayInHeading: true })).toBe("Sale en 15 min");
  });
});

describe("tripDurationLabel", () => {
  it("nombra la duración para que no quede un número suelto", () => {
    expect(tripDurationLabel(540)).toBe("Duración: 9 h");
    expect(tripDurationLabel(330)).toBe("Duración: 5 h 30 min");
  });
});
