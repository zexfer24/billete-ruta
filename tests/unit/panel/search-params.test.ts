import { describe, expect, it } from "vitest";
import { errorMessage, firstParam, okMessage } from "@/app/panel/_dashboard/search-params";

const LABELS = { cobro: "Cobro registrado." };

describe("firstParam", () => {
  it("devuelve el texto solo si llegó una vez", () => {
    expect(firstParam("hoy")).toBe("hoy");
    expect(firstParam(["a", "b"])).toBeUndefined();
    expect(firstParam(undefined)).toBeUndefined();
  });
});

describe("okMessage", () => {
  it("traduce un código conocido", () => {
    expect(okMessage(LABELS, "cobro")).toBe("Cobro registrado.");
  });

  it("ignora códigos desconocidos, repetidos o heredados de Object.prototype", () => {
    expect(okMessage(LABELS, "otro")).toBeUndefined();
    expect(okMessage(LABELS, ["cobro", "cobro"])).toBeUndefined();
    expect(okMessage(LABELS, "constructor")).toBeUndefined();
    expect(okMessage(LABELS, "toString")).toBeUndefined();
    expect(okMessage(LABELS, undefined)).toBeUndefined();
  });
});

describe("errorMessage", () => {
  it("devuelve el texto recortado y descarta el vacío", () => {
    expect(errorMessage("  Falta el monto.  ")).toBe("Falta el monto.");
    expect(errorMessage("   ")).toBeUndefined();
    expect(errorMessage(["a", "b"])).toBeUndefined();
  });

  it("acorta un texto demasiado largo", () => {
    const largo = "x".repeat(400);
    const resultado = errorMessage(largo, 300);
    expect(resultado).toHaveLength(301);
    expect(resultado?.endsWith("…")).toBe(true);
  });
});
