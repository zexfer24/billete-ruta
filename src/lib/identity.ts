import { caracasYear } from "./time";

/**
 * Documentos aceptados: cédula venezolana (V, E), pasaporte (P), RIF (J),
 * y documentos colombianos (CC, TI, CE). También se acepta el número sin prefijo.
 */
const ID_PATTERN = /^(?:[VEPJ]|CC|TI|CE)?\d{5,12}$/;
const PHONE_PATTERN = /^\+\d{8,15}$/;

const COUNTRY_CODES = { VE: "58", CO: "57" } as const;

/** Quita puntos, guiones y espacios, y pasa a mayúsculas. */
export function normalizeIdNumber(raw: string): string {
  return raw.toUpperCase().replace(/[\s.\-_]/g, "");
}

export function isValidIdNumber(raw: string): boolean {
  return ID_PATTERN.test(normalizeIdNumber(raw));
}

/**
 * Enmascara un documento dejando visibles solo los últimos tres caracteres.
 * Se usa en toda pantalla que no sea el manifiesto ni el módulo de usuarios.
 */
export function maskIdNumber(idNumber: string): string {
  const normalizado = normalizeIdNumber(idNumber);
  const prefijo = normalizado.match(/^[A-Z]+/)?.[0] ?? "";
  const digitos = normalizado.slice(prefijo.length);
  if (digitos.length <= 3) return `${prefijo}${digitos}`;
  return `${prefijo}${"*".repeat(digitos.length - 3)}${digitos.slice(-3)}`;
}

/** Lleva un teléfono a formato internacional E.164. */
export function normalizePhone(raw: string, defaultCountry: "VE" | "CO" = "VE"): string {
  const limpio = raw.replace(/[\s().\-]/g, "");
  if (limpio.startsWith("+")) return limpio;
  const sinCeros = limpio.replace(/^0+/, "");
  return `+${COUNTRY_CODES[defaultCountry]}${sinCeros}`;
}

export function isValidPhone(raw: string): boolean {
  return PHONE_PATTERN.test(raw);
}

/** Edad aproximada a partir del año de nacimiento, en hora de Caracas. */
export function ageFromBirthYear(birthYear: number, now: Date = new Date()): number {
  return caracasYear(now) - birthYear;
}

/** Un pasajero es menor si aún no cumple 18 en el año en curso. */
export function isMinor(birthYear: number, now: Date = new Date()): boolean {
  return ageFromBirthYear(birthYear, now) < 18;
}

/** Rango de años de nacimiento admitido en los formularios. */
export function isValidBirthYear(birthYear: number, now: Date = new Date()): boolean {
  return Number.isInteger(birthYear) && birthYear >= 1900 && birthYear <= caracasYear(now);
}
