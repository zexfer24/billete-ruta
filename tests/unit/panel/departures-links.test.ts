import { describe, expect, it } from "vitest";
import { inTodayOrTomorrow, proximasHref } from "@/app/panel/salidas/links";

describe("proximasHref", () => {
  it("sin nada, es la lista de próximas (hoy y mañana)", () => {
    expect(proximasHref({})).toBe("/panel/salidas");
  });

  it("con los días siguientes y el panel de crear", () => {
    expect(proximasHref({ todosLosDias: true })).toBe("/panel/salidas?dias=todos");
    expect(proximasHref({ todosLosDias: true, crear: true })).toBe("/panel/salidas?dias=todos&crear=1");
  });

  it("en el historial conserva la pestaña y no lleva días", () => {
    expect(proximasHref({ historial: true })).toBe("/panel/salidas?ver=historial");
    expect(proximasHref({ historial: true, todosLosDias: true, crear: true })).toBe("/panel/salidas?ver=historial&crear=1");
  });
});

describe("inTodayOrTomorrow", () => {
  // 23:30 del 30/09 en Caracas (UTC-4).
  const now = new Date("2026-10-01T03:30:00Z");

  it("hoy y mañana entran en la vista por defecto", () => {
    expect(inTodayOrTomorrow(new Date("2026-10-01T03:45:00Z"), now)).toBe(true); // hoy 23:45
    expect(inTodayOrTomorrow(new Date("2026-10-02T03:30:00Z"), now)).toBe(true); // mañana 23:30
  });

  it("pasado mañana ya no", () => {
    expect(inTodayOrTomorrow(new Date("2026-10-02T04:30:00Z"), now)).toBe(false); // 02/10 00:30
  });
});
