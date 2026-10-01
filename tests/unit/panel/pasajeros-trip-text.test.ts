import { describe, expect, it } from "vitest";
import { arrowRouteName, proofUrgency, tripWhenText } from "@/app/panel/pasajeros/trip-text";

// 20:15 del 30/09 en Caracas (UTC-4).
const NOW = new Date("2026-10-01T00:15:00Z");

describe("proofUrgency", () => {
  it("una salida programada cuya hora pasó lleva el aviso de atrasada del tablero", () => {
    const salida = { status: "PROGRAMADA", departsAt: new Date("2026-09-30T23:00:00Z") }; // 19:00
    expect(proofUrgency(salida, NOW)).toEqual({ kind: "atrasada", text: "Debía salir a las 19:00" });
  });

  it("con el embarque abierto y atrasada lo dice antes del atraso", () => {
    const salida = { status: "MANIFIESTO_CERRADO", departsAt: new Date("2026-09-30T23:00:00Z") };
    expect(proofUrgency(salida, NOW)?.text).toBe("Embarque abierto · debía salir a las 19:00");
  });

  it("dentro de la próxima hora dice cuántos minutos faltan", () => {
    const salida = { status: "PROGRAMADA", departsAt: new Date("2026-10-01T00:45:00Z") }; // 20:45
    expect(proofUrgency(salida, NOW)).toEqual({ kind: "pronto", text: "Sale en 30 min" });
  });

  it("dentro de las 6 horas dice cuántas horas faltan", () => {
    const salida = { status: "PROGRAMADA", departsAt: new Date("2026-10-01T03:35:00Z") }; // 23:35
    expect(proofUrgency(salida, NOW)).toEqual({ kind: "pronto", text: "Sale en 3 h 20 min" });
  });

  it("sin aviso a más de 6 horas, ni si la salida ya partió, llegó o se canceló", () => {
    expect(proofUrgency({ status: "PROGRAMADA", departsAt: new Date("2026-10-01T07:00:00Z") }, NOW)).toBeNull();
    for (const status of ["EN_RUTA", "FINALIZADA", "CANCELADA"]) {
      expect(proofUrgency({ status, departsAt: new Date("2026-09-30T23:00:00Z") }, NOW)).toBeNull();
    }
  });
});

describe("tripWhenText", () => {
  it("escribe el día en relativo y la hora en 24 horas", () => {
    expect(tripWhenText(new Date("2026-10-01T01:00:00Z"), NOW)).toBe("Hoy 21:00");
    expect(tripWhenText(new Date("2026-10-01T11:00:00Z"), NOW)).toBe("Mañana 07:00");
    expect(tripWhenText(new Date("2026-10-02T23:00:00Z"), NOW)).toBe("Viernes 02/10 19:00");
  });
});

describe("arrowRouteName", () => {
  it("cambia el guion o la raya del nombre de la ruta por la flecha del panel", () => {
    expect(arrowRouteName("Caracas – San Cristóbal")).toBe("Caracas → San Cristóbal");
    expect(arrowRouteName("Caracas - Mérida")).toBe("Caracas → Mérida");
  });

  it("deja igual un nombre sin separador o con guion dentro de una palabra", () => {
    expect(arrowRouteName("Expreso Los Llanos")).toBe("Expreso Los Llanos");
    expect(arrowRouteName("Puerto La Cruz-Express")).toBe("Puerto La Cruz-Express");
  });
});
