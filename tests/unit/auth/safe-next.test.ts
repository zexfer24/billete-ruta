import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-next";

describe("safeNext", () => {
  it("acepta una ruta interna con query", () => {
    expect(safeNext("/mi/reservar?origen=Caracas")).toBe("/mi/reservar?origen=Caracas");
  });

  it("rechaza un enlace de protocolo relativo a otro dominio", () => {
    expect(safeNext("//evil.com")).toBeNull();
  });

  it("rechaza una URL absoluta externa", () => {
    expect(safeNext("https://evil.com")).toBeNull();
  });

  it("rechaza una cadena que no empieza por una barra", () => {
    expect(safeNext("mi")).toBeNull();
  });

  it("rechaza una cadena vacía", () => {
    expect(safeNext("")).toBeNull();
  });

  it("rechaza un valor indefinido", () => {
    expect(safeNext(undefined)).toBeNull();
  });

  it("rechaza una ruta con barra invertida", () => {
    expect(safeNext("/mi\\evil.com")).toBeNull();
  });
});
