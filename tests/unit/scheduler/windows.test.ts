import { describe, expect, it } from "vitest";
import {
  UNPAID_EXPIRY_MINUTES,
  dueForConfirmation2h,
  dueForReminder24h,
  dueForRelease12h,
  nextRetryDelayMinutes,
} from "@/modules/scheduler";

const AHORA = new Date("2026-09-10T12:00:00Z");

describe("dueForReminder24h", () => {
  it("cubre de 12 h a 24 h y 5 min para recuperar avisos perdidos", () => {
    const { from, to } = dueForReminder24h(AHORA);
    expect(from.toISOString()).toBe("2026-09-11T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-09-11T12:05:00.000Z");
  });
});

describe("dueForRelease12h", () => {
  it("marca el corte a 12 horas de la salida", () => {
    expect(dueForRelease12h(AHORA).toISOString()).toBe("2026-09-11T00:00:00.000Z");
  });
});

describe("dueForConfirmation2h", () => {
  it("cubre de 30 min a 2 h y 5 min", () => {
    const { from, to } = dueForConfirmation2h(AHORA);
    expect(from.toISOString()).toBe("2026-09-10T12:30:00.000Z");
    expect(to.toISOString()).toBe("2026-09-10T14:05:00.000Z");
  });
});

describe("nextRetryDelayMinutes", () => {
  it("crece exponencialmente", () => {
    expect([1, 2, 3, 4, 5].map(nextRetryDelayMinutes)).toEqual([1, 4, 16, 64, 256]);
  });

  it("rechaza intentos fuera de rango", () => {
    expect(() => nextRetryDelayMinutes(0)).toThrow();
    expect(() => nextRetryDelayMinutes(6)).toThrow();
  });
});

describe("constantes de negocio", () => {
  it("libera una reserva sin pago a las dos horas", () => {
    expect(UNPAID_EXPIRY_MINUTES).toBe(120);
  });
});
