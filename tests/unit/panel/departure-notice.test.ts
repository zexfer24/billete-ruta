import { describe, expect, it } from "vitest";
import { departureNotice, noticeTextNoBreak } from "@/app/panel/_shared/departure-notice";

// 14:50 en Caracas (UTC-4).
const NOW = new Date("2026-09-30T18:50:00Z");

describe("departureNotice", () => {
  it("una salida programada cuya hora pasó está atrasada, con las palabras del tablero", () => {
    const salida = { status: "PROGRAMADA", departsAt: new Date("2026-09-30T17:00:00Z") };
    expect(departureNotice(salida, NOW)).toEqual({ kind: "atrasada", text: "Debía salir a las 13:00" });
  });

  it("con el embarque abierto lo dice antes del atraso", () => {
    const salida = { status: "MANIFIESTO_CERRADO", departsAt: new Date("2026-09-30T17:00:00Z") };
    expect(departureNotice(salida, NOW)?.text).toBe("Embarque abierto · debía salir a las 13:00");
  });

  it("una atrasada de ayer conserva el día y nunca dice «Salió»", () => {
    const now = new Date("2026-10-01T04:30:00Z"); // 00:30 del 01/10 en Caracas
    const salida = { status: "PROGRAMADA", departsAt: new Date("2026-10-01T03:30:00Z") }; // 23:30 del 30/09
    const aviso = departureNotice(salida, now);
    expect(aviso).toEqual({ kind: "atrasada", text: "Debía salir ayer a las 23:30" });
  });

  it("dentro de la próxima hora avisa que sale pronto", () => {
    const salida = { status: "PROGRAMADA", departsAt: new Date("2026-09-30T19:05:00Z") };
    expect(departureNotice(salida, NOW)).toEqual({ kind: "pronto", text: "Sale en 15 min" });
  });

  it("sin aviso si falta más de una hora, o si ya partió, llegó o se canceló", () => {
    expect(departureNotice({ status: "PROGRAMADA", departsAt: new Date("2026-09-30T20:30:00Z") }, NOW)).toBeNull();
    for (const status of ["EN_RUTA", "FINALIZADA", "CANCELADA"]) {
      expect(departureNotice({ status, departsAt: new Date("2026-09-30T17:00:00Z") }, NOW)).toBeNull();
    }
  });
});

describe("noticeTextNoBreak", () => {
  it("pega la hora a sus palabras para que no se parta en dos renglones", () => {
    expect(noticeTextNoBreak("Debía salir a las 21:00")).toBe("Debía salir a\u00A0las\u00A021:00");
    expect(noticeTextNoBreak("Debía salir ayer a las 23:30")).toBe("Debía salir ayer a\u00A0las\u00A023:30");
    expect(noticeTextNoBreak("Sale en 15 min")).toBe("Sale en\u00A015\u00A0min");
    expect(noticeTextNoBreak("Sale ahora")).toBe("Sale ahora");
  });
});
