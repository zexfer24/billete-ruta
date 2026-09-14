import { describe, expect, it } from "vitest";
import { AGENCY_COLORS, agencyColor, agencyColorIndex, agencyInitials } from "@/lib/brand";

describe("agencyColorIndex", () => {
  it("es estable para el mismo id", () => {
    const id = "agencia-los-andes";
    expect(agencyColorIndex(id)).toBe(agencyColorIndex(id));
  });

  it("cae siempre en el rango 0 a 5", () => {
    for (const id of ["a", "agencia-1", "Expresos Los Andes", "z9z9z9z9", ""]) {
      const indice = agencyColorIndex(id);
      expect(indice).toBeGreaterThanOrEqual(0);
      expect(indice).toBeLessThanOrEqual(5);
    }
  });

  it("dos ids distintos caen en índices distintos", () => {
    expect(agencyColorIndex("a")).not.toBe(agencyColorIndex("b"));
  });
});

describe("agencyColor", () => {
  it("devuelve un color de la tabla con texto blanco", () => {
    const color = agencyColor("agencia-los-andes");
    expect(AGENCY_COLORS).toContainEqual(color);
    expect(color.fg).toBe("#ffffff");
  });
});

describe("agencyInitials", () => {
  it("toma la primera letra de hasta tres palabras", () => {
    expect(agencyInitials("Expresos Los Andes")).toBe("ELA");
    expect(agencyInitials("Transporte Caribe")).toBe("TC");
  });

  it("con una sola palabra devuelve sus primeras tres letras en mayúsculas", () => {
    expect(agencyInitials("Andina")).toBe("AND");
  });

  it("con cadena vacía devuelve cadena vacía", () => {
    expect(agencyInitials("")).toBe("");
    expect(agencyInitials("   ")).toBe("");
  });
});
