import { describe, expect, it } from "vitest";
import {
  ageFromBirthYear,
  isMinor,
  isValidBirthYear,
  isValidIdNumber,
  isValidPhone,
  maskIdNumber,
  normalizeIdNumber,
  normalizePhone,
} from "@/lib/identity";

const AHORA = new Date("2026-09-10T12:00:00Z");

describe("normalizeIdNumber", () => {
  it("pasa a mayúsculas y quita puntos, guiones y espacios", () => {
    expect(normalizeIdNumber(" v-12.345.678 ")).toBe("V12345678");
    expect(normalizeIdNumber("cc 1.020.304")).toBe("CC1020304");
  });
});

describe("isValidIdNumber", () => {
  it("acepta documentos venezolanos y colombianos", () => {
    for (const valor of ["V12345678", "E81234567", "P0123456", "J123456789", "CC1020304"]) {
      expect(isValidIdNumber(valor)).toBe(true);
    }
  });

  it("acepta un número sin prefijo", () => {
    expect(isValidIdNumber("12345678")).toBe(true);
  });

  it("rechaza vacíos, muy cortos, muy largos o con símbolos", () => {
    for (const valor of ["", "V123", "V1234567890123", "V123456#8"]) {
      expect(isValidIdNumber(valor)).toBe(false);
    }
  });
});

describe("maskIdNumber", () => {
  it("deja visibles solo los tres últimos dígitos y conserva el prefijo", () => {
    expect(maskIdNumber("V12345678")).toBe("V*****678");
    expect(maskIdNumber("12345678")).toBe("*****678");
    expect(maskIdNumber("CC1020304")).toBe("CC****304");
  });

  it("no enmascara documentos de tres dígitos o menos", () => {
    expect(maskIdNumber("V123")).toBe("V123");
  });
});

describe("normalizePhone", () => {
  it("conserva un número ya internacional", () => {
    expect(normalizePhone("+58 412-111 22 33")).toBe("+584121112233");
  });

  it("antepone el código de Venezuela y quita el cero inicial", () => {
    expect(normalizePhone("0412-1112233", "VE")).toBe("+584121112233");
  });

  it("antepone el código de Colombia", () => {
    expect(normalizePhone("3001112233", "CO")).toBe("+573001112233");
  });
});

describe("isValidPhone", () => {
  it("acepta formato internacional", () => {
    expect(isValidPhone("+584121112233")).toBe(true);
  });

  it("rechaza sin prefijo internacional o con letras", () => {
    expect(isValidPhone("4121112233")).toBe(false);
    expect(isValidPhone("+58412ABC")).toBe(false);
  });
});

describe("edad", () => {
  it("calcula la edad desde el año de nacimiento", () => {
    expect(ageFromBirthYear(2000, AHORA)).toBe(26);
  });

  it("identifica a los menores de edad", () => {
    expect(isMinor(2010, AHORA)).toBe(true);
    expect(isMinor(2008, AHORA)).toBe(false);
  });

  it("valida el rango de años admitido", () => {
    expect(isValidBirthYear(1990, AHORA)).toBe(true);
    expect(isValidBirthYear(1899, AHORA)).toBe(false);
    expect(isValidBirthYear(2027, AHORA)).toBe(false);
  });
});
