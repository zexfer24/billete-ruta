import { describe, expect, it } from "vitest";
import {
  caracasHourEnd,
  caracasHourStart,
  caracasHourValue,
  caracasParts,
  durationMinutes,
  formatCaracasDate,
  formatCaracasDateTime24,
  formatCaracasTime24,
  formatDuration,
} from "@/lib/time";

describe("formato en hora de Caracas", () => {
  it("usa reloj de 24 horas", () => {
    expect(formatCaracasTime24(new Date("2026-08-16T02:00:00Z"))).toBe("22:00");
    expect(formatCaracasTime24(new Date("2026-08-15T23:30:00Z"))).toBe("19:30");
  });

  it("muestra fecha y hora completas", () => {
    expect(formatCaracasDateTime24(new Date("2026-08-16T02:00:00Z"))).toBe("15/08/2026 22:00");
  });

  it("muestra solo la fecha", () => {
    expect(formatCaracasDate(new Date("2026-08-16T02:00:00Z"))).toBe("15/08/2026");
  });

  it("extrae mes y día para el serial del ticket", () => {
    expect(caracasParts(new Date("2026-08-16T02:00:00Z"))).toEqual({ month: "08", day: "15" });
  });
});

describe("horas de Caracas para filtros", () => {
  const fallback = new Date("2026-01-01T00:00:00Z");

  it("construye el inicio de una hora en Caracas", () => {
    expect(caracasHourStart("2026-09-10", "06", fallback)).toEqual(
      new Date("2026-09-10T10:00:00.000Z"),
    );
  });

  it("construye el fin de una hora en Caracas", () => {
    expect(caracasHourEnd("2026-09-10", "14", fallback)).toEqual(
      new Date("2026-09-10T18:59:59.999Z"),
    );
  });

  it("cubre los bordes 00 y 23", () => {
    expect(caracasHourStart("2026-09-10", "00", fallback)).toEqual(
      new Date("2026-09-10T04:00:00.000Z"),
    );
    expect(caracasHourEnd("2026-09-10", "23", fallback)).toEqual(
      new Date("2026-09-11T03:59:59.999Z"),
    );
  });

  it("cae al valor por defecto con una hora fuera de rango o mal formada", () => {
    expect(caracasHourStart("2026-09-10", "24", fallback)).toBe(fallback);
    expect(caracasHourStart("2026-09-10", "7", fallback)).toBe(fallback);
    expect(caracasHourStart("2026-09-10", "ab", fallback)).toBe(fallback);
    expect(caracasHourEnd("2026-09-10", "24", fallback)).toBe(fallback);
  });

  it("cae al valor por defecto con una fecha inválida", () => {
    expect(caracasHourStart("2026-13-45", "06", fallback)).toBe(fallback);
    expect(caracasHourStart("ayer", "06", fallback)).toBe(fallback);
  });

  it("extrae la hora de Caracas como HH", () => {
    expect(caracasHourValue(new Date("2026-09-10T02:30:00Z"))).toBe("22");
  });
});

describe("duración", () => {
  it("cuenta los minutos entre dos instantes", () => {
    expect(
      durationMinutes(new Date("2026-08-15T10:00:00Z"), new Date("2026-08-15T14:35:00Z")),
    ).toBe(275);
  });

  it("formatea horas y minutos", () => {
    expect(formatDuration(275)).toBe("4 h 35 min");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(120)).toBe("2 h");
    expect(formatDuration(0)).toBe("0 min");
  });
});
