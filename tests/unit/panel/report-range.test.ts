import { describe, expect, it } from "vitest";
import { caracasPeriodRange } from "@/lib/time";
import { last24h } from "@/modules/reports";
import { reportViewFromSlug, resolveMovementsRange, resolveRevenueRange } from "@/app/panel/reportes/range";

const NOW = new Date("2026-09-13T02:30:00Z");

describe("reportViewFromSlug", () => {
  it("acepta 'recaudacion' y 'movimientos'", () => {
    expect(reportViewFromSlug("recaudacion")).toBe("recaudacion");
    expect(reportViewFromSlug("movimientos")).toBe("movimientos");
  });

  it("cae en 'recaudacion' con undefined o un valor desconocido", () => {
    expect(reportViewFromSlug(undefined)).toBe("recaudacion");
    expect(reportViewFromSlug("otro")).toBe("recaudacion");
  });
});

describe("resolveRevenueRange", () => {
  it("sin parámetros, usa las últimas 24 h", () => {
    const defaults = last24h(NOW);
    const rango = resolveRevenueRange({}, NOW);
    expect(rango.preset).toBe("24h");
    expect(rango.from).toEqual(defaults.from);
    expect(rango.to).toEqual(defaults.to);
  });

  it("periodo=7d usa el mismo rango que caracasPeriodRange", () => {
    const esperado = caracasPeriodRange("7d", NOW);
    const rango = resolveRevenueRange({ periodo: "7d" }, NOW);
    expect(rango.preset).toBe("7d");
    expect(rango.from).toEqual(esperado.from);
    expect(rango.to).toEqual(esperado.to);
  });

  it("periodo=7d gana aunque venga 'desde'", () => {
    const esperado = caracasPeriodRange("7d", NOW);
    const rango = resolveRevenueRange({ periodo: "7d", desde: "2026-09-01" }, NOW);
    expect(rango.preset).toBe("7d");
    expect(rango.from).toEqual(esperado.from);
    expect(rango.to).toEqual(esperado.to);
  });

  it("periodo=semana no es válido; sin fechas, últimas 24 h", () => {
    const defaults = last24h(NOW);
    const rango = resolveRevenueRange({ periodo: "semana" }, NOW);
    expect(rango.preset).toBe("24h");
    expect(rango.from).toEqual(defaults.from);
    expect(rango.to).toEqual(defaults.to);
  });

  it("rango personalizado con fecha y hora", () => {
    const rango = resolveRevenueRange(
      { desde: "2026-09-10", horaDesde: "08", hasta: "2026-09-11", horaHasta: "18" },
      NOW,
    );
    expect(rango.preset).toBe("personalizado");
    expect(rango.from).toEqual(new Date("2026-09-10T12:00:00.000Z"));
    expect(rango.to).toEqual(new Date("2026-09-11T22:59:59.999Z"));
  });

  it("si from > to, vuelve a las últimas 24 h", () => {
    const defaults = last24h(NOW);
    const rango = resolveRevenueRange({ desde: "2026-09-12", hasta: "2026-09-01" }, NOW);
    expect(rango.preset).toBe("24h");
    expect(rango.from).toEqual(defaults.from);
    expect(rango.to).toEqual(defaults.to);
  });
});

describe("resolveMovementsRange", () => {
  it("sin parámetros, usa las últimas 24 h", () => {
    const defaults = last24h(NOW);
    const rango = resolveMovementsRange({}, NOW);
    expect(rango.preset).toBe("24h");
    expect(rango.from).toEqual(defaults.from);
    expect(rango.to).toEqual(defaults.to);
  });

  it("periodo=30d usa el mismo rango que caracasPeriodRange", () => {
    const esperado = caracasPeriodRange("30d", NOW);
    const rango = resolveMovementsRange({ periodo: "30d" }, NOW);
    expect(rango.preset).toBe("30d");
    expect(rango.from).toEqual(esperado.from);
    expect(rango.to).toEqual(esperado.to);
  });

  it("rango personalizado con días completos", () => {
    const rango = resolveMovementsRange({ desde: "2026-09-10", hasta: "2026-09-11" }, NOW);
    expect(rango.preset).toBe("personalizado");
    expect(rango.from).toEqual(new Date("2026-09-10T04:00:00.000Z"));
    expect(rango.to).toEqual(new Date("2026-09-12T03:59:59.999Z"));
  });

  it("si from > to, vuelve a las últimas 24 h", () => {
    const defaults = last24h(NOW);
    const rango = resolveMovementsRange({ desde: "2026-09-12", hasta: "2026-09-01" }, NOW);
    expect(rango.preset).toBe("24h");
    expect(rango.from).toEqual(defaults.from);
    expect(rango.to).toEqual(defaults.to);
  });
});
