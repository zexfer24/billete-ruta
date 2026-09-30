import { describe, expect, it } from "vitest";
import { proximasHref } from "@/app/panel/salidas/links";

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
