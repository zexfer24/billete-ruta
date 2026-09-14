import { describe, expect, it } from "vitest";
import {
  caracasDayRange,
  caracasHourEnd,
  caracasHourStart,
  caracasHourValue,
  caracasParts,
  caracasPeriodRange,
  durationMinutes,
  formatCaracasDate,
  formatCaracasDateTime24,
  formatCaracasTime24,
  formatDuration,
  formatRelativeDeparture,
  minutesUntil,
  periodFromSlug,
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

describe("minutesUntil", () => {
  const now = new Date("2026-09-10T14:00:00Z");

  it("devuelve un número positivo cuando la fecha está por venir", () => {
    expect(minutesUntil(new Date("2026-09-10T14:15:00Z"), now)).toBe(15);
  });

  it("devuelve un número negativo cuando la fecha ya pasó", () => {
    expect(minutesUntil(new Date("2026-09-10T13:50:00Z"), now)).toBe(-10);
  });

  it("devuelve cero cuando la fecha es el mismo instante", () => {
    expect(minutesUntil(now, now)).toBe(0);
  });
});

describe("formatRelativeDeparture", () => {
  // now = 10:00 en Caracas del 10/09/2026 (UTC-4).
  const now = new Date("2026-09-10T14:00:00Z");

  it("dice 'Salió' cuando la diferencia es negativa", () => {
    expect(formatRelativeDeparture(new Date("2026-09-10T13:50:00Z"), now)).toBe("Salió");
  });

  it("dice 'Sale ahora' cuando falta menos de un minuto", () => {
    expect(formatRelativeDeparture(new Date("2026-09-10T14:00:30Z"), now)).toBe("Sale ahora");
  });

  it("dice 'Sale en N min' cuando faltan menos de 60 minutos", () => {
    expect(formatRelativeDeparture(new Date("2026-09-10T14:15:00Z"), now)).toBe("Sale en 15 min");
  });

  it("dice 'Sale a las HH:mm' cuando es el mismo día en Caracas", () => {
    // 13:00 en Caracas del mismo 10/09/2026, 3 h después de `now`.
    expect(formatRelativeDeparture(new Date("2026-09-10T17:00:00Z"), now)).toBe(
      "Sale a las 13:00",
    );
  });

  it("dice 'dd/MM HH:mm' cuando es otro día", () => {
    // 12:00 en Caracas del 11/09/2026, más de 60 min después y otro día.
    expect(formatRelativeDeparture(new Date("2026-09-11T16:00:00Z"), now)).toBe("11/09 12:00");
  });

  it("con `now` a las 23:50 en Caracas y salida a las 00:20 del día siguiente, cae en 'Sale en 30 min'", () => {
    const nowTarde = new Date("2026-09-11T03:50:00Z"); // 23:50 Caracas del 10/09/2026
    const salida = new Date("2026-09-11T04:20:00Z"); // 00:20 Caracas del 11/09/2026
    expect(formatRelativeDeparture(salida, nowTarde)).toBe("Sale en 30 min");
  });

  it("con `now` a las 23:00 en Caracas y salida a la 01:00 del día siguiente, cae en 'dd/MM HH:mm'", () => {
    const nowTarde = new Date("2026-09-11T03:00:00Z"); // 23:00 Caracas del 10/09/2026
    const salida = new Date("2026-09-11T05:00:00Z"); // 01:00 Caracas del 11/09/2026
    expect(formatRelativeDeparture(salida, nowTarde)).toBe("11/09 01:00");
  });
});

describe("periodFromSlug", () => {
  it("traduce los tres slugs válidos", () => {
    expect(periodFromSlug("hoy")).toBe("hoy");
    expect(periodFromSlug("7d")).toBe("7d");
    expect(periodFromSlug("30d")).toBe("30d");
  });

  it("cae en 'hoy' con undefined o un valor desconocido", () => {
    expect(periodFromSlug(undefined)).toBe("hoy");
    expect(periodFromSlug("semana")).toBe("hoy");
  });

  it("no deja que una clave heredada de Object.prototype cuele como período válido", () => {
    expect(periodFromSlug("constructor")).toBe("hoy");
  });
});

describe("caracasPeriodRange", () => {
  // now = 2026-09-13T02:30:00Z, que en Caracas (UTC-4) es el 12/09/2026 a las 22:30.
  const now = new Date("2026-09-13T02:30:00Z");

  it("'hoy' empieza en el inicio del día de hoy en Caracas", () => {
    const { from, to } = caracasPeriodRange("hoy", now);
    expect(from).toEqual(new Date("2026-09-12T04:00:00.000Z"));
    expect(to).toBe(now);
  });

  it("'7d' empieza siete días antes, al inicio del día en Caracas", () => {
    const { from, to } = caracasPeriodRange("7d", now);
    expect(from).toEqual(new Date("2026-09-06T04:00:00.000Z"));
    expect(to).toBe(now);
  });

  it("'30d' empieza treinta días antes, al inicio del día en Caracas", () => {
    const { from, to } = caracasPeriodRange("30d", now);
    expect(from).toEqual(new Date("2026-08-14T04:00:00.000Z"));
    expect(to).toBe(now);
  });
});

describe("caracasDayRange", () => {
  it("va desde el inicio hasta el fin del día de `now` en Caracas", () => {
    const now = new Date("2026-09-13T02:30:00Z"); // 22:30 Caracas del 12/09/2026
    const { from, to } = caracasDayRange(now);
    expect(from).toEqual(new Date("2026-09-12T04:00:00.000Z"));
    expect(to).toEqual(new Date("2026-09-13T03:59:59.999Z"));
  });
});
