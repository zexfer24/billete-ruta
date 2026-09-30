import { describe, expect, it } from "vitest";
import { caracasDayEnd, caracasDayStart, caracasPeriodRange } from "@/lib/time";
import { last24h } from "@/modules/reports";
import {
  describeAdminRange,
  periodParamsSchema,
  periodQuery,
  periodTabs,
  rangeKey,
  resolveAdminRange,
  spansSeveralDays,
  withQuery,
} from "@/app/panel/admin/_shared/period";

// 30/09/2026 10:30 en Caracas (UTC−4).
const NOW = new Date("2026-09-30T14:30:00Z");

describe("periodParamsSchema", () => {
  it("nunca lanza: fechas mal formadas o repetidas caen a undefined", () => {
    const parsed = periodParamsSchema.parse({ from: "abc", to: ["2026-09-01", "2026-09-02"], periodo: 7 });
    expect(parsed).toEqual({ from: undefined, to: undefined, periodo: undefined });
  });

  it("conserva fechas AAAA-MM-DD válidas", () => {
    expect(periodParamsSchema.parse({ from: "2026-09-01", to: "2026-09-05" })).toMatchObject({
      from: "2026-09-01",
      to: "2026-09-05",
    });
  });
});

describe("resolveAdminRange", () => {
  it("sin parámetros usa las últimas 24 horas", () => {
    const range = resolveAdminRange({}, NOW);
    expect(range.period).toBe("24h");
    expect(range.from).toEqual(last24h(NOW).from);
    expect(range.to).toEqual(NOW);
  });

  it("un periodo desconocido también cae en las últimas 24 horas", () => {
    expect(resolveAdminRange({ periodo: "constructor" }, NOW).period).toBe("24h");
  });

  it("7d y 30d usan los mismos rangos que el tablero del operador", () => {
    expect(resolveAdminRange({ periodo: "7d" }, NOW)).toMatchObject({ period: "7d", ...caracasPeriodRange("7d", NOW) });
    expect(resolveAdminRange({ periodo: "30d" }, NOW)).toMatchObject({
      period: "30d",
      ...caracasPeriodRange("30d", NOW),
    });
  });

  it("fechas elegidas: días completos en hora de Caracas", () => {
    const range = resolveAdminRange({ periodo: "fechas", from: "2026-09-01", to: "2026-09-05" }, NOW);
    expect(range.period).toBe("fechas");
    expect(range.from).toEqual(caracasDayStart("2026-09-01", NOW));
    expect(range.to).toEqual(caracasDayEnd("2026-09-05", NOW));
    expect(range.fromInput).toBe("2026-09-01");
    expect(range.toInput).toBe("2026-09-05");
  });

  it("from y to sin periodo (enlaces viejos) también cuentan como fechas elegidas", () => {
    expect(resolveAdminRange({ from: "2026-09-01", to: "2026-09-02" }, NOW).period).toBe("fechas");
  });

  it("fechas al revés se intercambian", () => {
    const range = resolveAdminRange({ periodo: "fechas", from: "2026-09-10", to: "2026-09-03" }, NOW);
    expect(range.fromInput).toBe("2026-09-03");
    expect(range.toInput).toBe("2026-09-10");
    expect(range.from < range.to).toBe(true);
  });

  it("con un solo extremo usa ese mismo día; sin ninguno, hoy", () => {
    expect(resolveAdminRange({ periodo: "fechas", from: "2026-09-12" }, NOW)).toMatchObject({
      fromInput: "2026-09-12",
      toInput: "2026-09-12",
    });
    expect(resolveAdminRange({ periodo: "fechas" }, NOW)).toMatchObject({
      fromInput: "2026-09-30",
      toInput: "2026-09-30",
    });
  });

  it("una fecha imposible no rompe: cae en hoy", () => {
    const range = resolveAdminRange({ periodo: "fechas", from: "2026-99-99", to: "2026-99-99" }, NOW);
    expect(range.fromInput).toBe("2026-09-30");
    expect(range.toInput).toBe("2026-09-30");
  });
});

describe("periodQuery, withQuery y periodTabs", () => {
  it("las últimas 24 horas no llevan parámetros", () => {
    expect(periodQuery(resolveAdminRange({}, NOW))).toEqual({});
    expect(periodQuery(resolveAdminRange({ periodo: "7d" }, NOW))).toEqual({ periodo: "7d" });
    expect(periodQuery(resolveAdminRange({ periodo: "fechas", from: "2026-09-01", to: "2026-09-02" }, NOW))).toEqual({
      periodo: "fechas",
      from: "2026-09-01",
      to: "2026-09-02",
    });
  });

  it("withQuery omite los valores vacíos", () => {
    expect(withQuery("/x", {})).toBe("/x");
    expect(withQuery("/x", { a: "1", b: undefined, c: "" })).toBe("/x?a=1");
  });

  it("las pestañas conservan los demás filtros y marcan la activa", () => {
    const range = resolveAdminRange({ periodo: "7d" }, NOW);
    const tabs = periodTabs("/panel/admin/movimientos", range, { agency: "abc" });
    expect(tabs.map((t) => t.label)).toEqual(["Últimas 24 horas", "7 días", "30 días", "Otras fechas"]);
    expect(tabs.find((t) => t.active)?.period).toBe("7d");
    expect(tabs[0]?.href).toBe("/panel/admin/movimientos?agency=abc");
    expect(tabs[2]?.href).toBe("/panel/admin/movimientos?agency=abc&periodo=30d");
    expect(tabs[3]?.href).toContain("periodo=fechas");
  });
});

describe("describeAdminRange, spansSeveralDays y rangeKey", () => {
  it("describe cada periodo en palabras", () => {
    expect(describeAdminRange(resolveAdminRange({}, NOW))).toBe("Desde el 29/09/2026 a las 10:30 hasta ahora");
    expect(describeAdminRange(resolveAdminRange({ periodo: "fechas", from: "2026-09-01", to: "2026-09-05" }, NOW))).toBe(
      "Del 01/09/2026 al 05/09/2026",
    );
    expect(describeAdminRange(resolveAdminRange({ periodo: "fechas", from: "2026-09-01" }, NOW))).toBe(
      "El 01/09/2026",
    );
  });

  it("sabe si el rango abarca varios días", () => {
    expect(spansSeveralDays(resolveAdminRange({ periodo: "fechas", from: "2026-09-01" }, NOW))).toBe(false);
    expect(spansSeveralDays(resolveAdminRange({ periodo: "7d" }, NOW))).toBe(true);
  });

  it("la clave no cambia con el paso del tiempo en las últimas 24 horas", () => {
    const later = new Date(NOW.getTime() + 60_000);
    expect(rangeKey(resolveAdminRange({}, NOW))).toBe(rangeKey(resolveAdminRange({}, later)));
    expect(rangeKey(resolveAdminRange({ periodo: "fechas", from: "2026-09-01" }, NOW))).toBe(
      "fechas:2026-09-01:2026-09-01",
    );
  });
});
