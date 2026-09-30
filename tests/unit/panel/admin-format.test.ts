import { describe, expect, it } from "vitest";
import { cleanSearch, countLabel, formatCount, pageFromParam } from "@/app/panel/admin/_shared/format";
import { INVALID_AMOUNT_MESSAGE, formatAmount, parseAmount } from "@/app/panel/admin/tasas/amount";
import { messageStatusFromParam, payloadToParams, templateName } from "@/app/panel/admin/mensajes/messages";

describe("countLabel y formatCount", () => {
  it("usa el singular solo con 1", () => {
    expect(countLabel(1, "reserva pagada", "reservas pagadas")).toBe("1 reserva pagada");
    expect(countLabel(0, "reserva pagada", "reservas pagadas")).toBe("0 reservas pagadas");
    expect(countLabel(3, "pasajero", "pasajeros")).toBe("3 pasajeros");
  });

  it("separa los miles con punto", () => {
    expect(formatCount(1234)).toBe("1.234");
    expect(countLabel(12500, "cuenta", "cuentas")).toBe("12.500 cuentas");
  });
});

describe("cleanSearch y pageFromParam", () => {
  it("limpia la búsqueda y la deja vacía como undefined", () => {
    expect(cleanSearch("  María  ")).toBe("María");
    expect(cleanSearch("   ")).toBeUndefined();
    expect(cleanSearch(undefined)).toBeUndefined();
    expect(cleanSearch("x".repeat(200))?.length).toBe(80);
  });

  it("una página no numérica, cero o negativa da 1", () => {
    expect(pageFromParam(undefined)).toBe(1);
    expect(pageFromParam("a")).toBe(1);
    expect(pageFromParam("0")).toBe(1);
    expect(pageFromParam("-2")).toBe(1);
    expect(pageFromParam("1e3")).toBe(1);
    expect(pageFromParam("3")).toBe(3);
  });
});

describe("parseAmount y formatAmount (tasas)", () => {
  it("acepta coma o punto decimal y montos mayores que cero", () => {
    expect(parseAmount("2,50")).toBe("2.50");
    expect(parseAmount(" 36.4 ")).toBe("36.4");
    expect(parseAmount("4000")).toBe("4000");
    expect(parseAmount("0,5")).toBe("0.5");
  });

  it("rechaza lo que no es un monto positivo", () => {
    for (const raw of ["", "0", "0,00", "-2", "abc", "1.234,56", "1e3", "0x10", "2,5,0"]) {
      expect(parseAmount(raw)).toBeNull();
    }
    expect(INVALID_AMOUNT_MESSAGE).toMatch(/coma/);
  });

  it("formatea con coma decimal y punto de miles", () => {
    expect(formatAmount("2.5", "$")).toBe("$ 2,50");
    expect(formatAmount("36500.1234", "Bs.")).toBe("Bs. 36.500,1234");
  });
});

describe("mensajes", () => {
  it("solo acepta estados conocidos en ?status=", () => {
    expect(messageStatusFromParam("FALLIDO")).toBe("FALLIDO");
    expect(messageStatusFromParam("fallido")).toBeUndefined();
    expect(messageStatusFromParam(["FALLIDO"])).toBeUndefined();
    expect(messageStatusFromParam(undefined)).toBeUndefined();
  });

  it("muestra el nombre legible de la plantilla, o la clave si no la conoce", () => {
    expect(templateName("ticket_emitido")).toBe("Ticket emitido");
    expect(templateName("otra_cosa")).toBe("otra_cosa");
    expect(templateName("constructor")).toBe("constructor");
  });

  it("convierte el payload a textos y descarta lo que no es un objeto", () => {
    expect(payloadToParams({ nombre: "Ana", pasajeros: 2, vacio: null })).toEqual({ nombre: "Ana", pasajeros: "2" });
    expect(payloadToParams(null)).toEqual({});
    expect(payloadToParams(["a"])).toEqual({});
  });
});
