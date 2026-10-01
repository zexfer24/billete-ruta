import { describe, expect, it } from "vitest";
import { dateTimePhrase } from "@/app/panel/admin/_shared/format";
import { arrivesAnotherDay, tripHoursParts } from "@/app/panel/admin/_shared/trip-hours";
import { SEND_DELAY_NOTICE_MS, sendDelayText, sentLate } from "@/app/panel/admin/mensajes/messages";

// Caracas es UTC−4 todo el año: 14:25 UTC son las 10:25 en Caracas.
const salida = new Date("2026-09-30T14:25:00Z");
const llegadaMismoDia = new Date("2026-10-01T02:18:00Z"); // 22:18 del 30/09 en Caracas
const llegadaOtroDia = new Date("2026-10-01T14:21:00Z"); // 10:21 del 01/10 en Caracas

describe("dateTimePhrase", () => {
  it("escribe la fecha y la hora en una sola frase, en hora de Caracas", () => {
    expect(dateTimePhrase(new Date("2026-09-30T05:12:00Z"))).toBe("el 30/09/2026 a las 01:12");
  });
});

describe("arrivesAnotherDay", () => {
  it("compara los días del calendario de Caracas, no de UTC", () => {
    expect(arrivesAnotherDay(salida, llegadaMismoDia)).toBe(false);
    expect(arrivesAnotherDay(salida, llegadaOtroDia)).toBe(true);
  });

  it("sin salida o sin llegada no cruza de día", () => {
    expect(arrivesAnotherDay(null, llegadaOtroDia)).toBe(false);
    expect(arrivesAnotherDay(salida, null)).toBe(false);
  });
});

describe("tripHoursParts", () => {
  it("el mismo día lleva solo las horas", () => {
    expect(tripHoursParts(salida, llegadaMismoDia)).toEqual(["Salió 10:25", "Llegó 22:18"]);
  });

  it("si cruza de día, cada hora lleva su fecha, sin partirse de ella", () => {
    expect(tripHoursParts(salida, llegadaOtroDia)).toEqual(["Salió 30/09 10:25", "Llegó 01/10 10:21"]);
  });

  it("en ruta solo dice la salida; sin salida, el embarque", () => {
    expect(tripHoursParts(salida, null)).toEqual(["Salió 10:25"]);
    expect(tripHoursParts(null, null, new Date("2026-09-30T13:40:00Z"))).toEqual(["Embarque desde 09:40"]);
    expect(tripHoursParts(null, null)).toEqual([]);
  });
});

describe("sentLate y sendDelayText", () => {
  const programado = new Date("2026-10-01T06:28:00Z");

  it("la espera normal del worker (un minuto y algo) no se muestra", () => {
    const enviado = new Date(programado.getTime() + 61_000);
    expect(sentLate(programado, enviado)).toBe(false);
    expect(sendDelayText(programado, enviado)).toBeNull();
  });

  it("un atraso de 15 minutos o más sí se muestra, en llano", () => {
    expect(sentLate(programado, new Date(programado.getTime() + SEND_DELAY_NOTICE_MS))).toBe(true);
    expect(sendDelayText(programado, new Date(programado.getTime() + 20 * 60_000))).toBe("Salió con 20 min de retraso");
    expect(sendDelayText(programado, new Date(programado.getTime() + 250 * 60_000))).toBe(
      "Salió con 4 h 10 min de retraso",
    );
  });

  it("un mensaje que todavía no sale no tiene atraso que mostrar", () => {
    expect(sentLate(programado, null)).toBe(false);
    expect(sendDelayText(programado, null)).toBeNull();
  });
});
