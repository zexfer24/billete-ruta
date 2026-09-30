import { describe, expect, it } from "vitest";
import {
  departureDayLabel,
  departureUrgencyLabel,
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
    expect(seatsLabel(4)).toBe("4 puestos");
    expect(seatsLabel(40)).toBe("40 puestos");
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

  it("muestra día y mes para fechas más lejanas", () => {
    expect(departureDayLabel(new Date("2026-10-03T16:00:00Z"), now)).toBe("03/10");
  });
});
