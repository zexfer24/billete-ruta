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

/** Luminancia relativa WCAG 2.x de un color hexadecimal de seis dígitos. */
function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** Razón de contraste WCAG entre dos colores (de 1 a 21). */
function contrastRatio(a: string, b: string): number {
  const [claro, oscuro] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (claro! + 0.05) / (oscuro! + 0.05);
}

describe("AGENCY_COLORS", () => {
  it("tiene seis colores", () => {
    expect(AGENCY_COLORS).toHaveLength(6);
  });

  it("cada bloque tiene contraste WCAG de 4.5:1 o más con su texto blanco", () => {
    for (const color of AGENCY_COLORS) {
      expect(color.bg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(color.fg).toBe("#ffffff");
      expect(contrastRatio(color.bg, color.fg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("la fórmula de contraste da 21:1 entre negro y blanco", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
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
