import { describe, expect, it } from "vitest";
import { loadEnv } from "@/lib/env";

const base = {
  DATABASE_URL: "postgresql://ticketruta:ticketruta@localhost:5434/ticketruta",
  SESSION_SECRET: "0123456789abcdef0123456789abcdef",
  TICKET_SECRET: "abcdef0123456789abcdef0123456789",
  WHATSAPP_PROVIDER: "fake",
  PUBLIC_BASE_URL: "http://localhost:3000",
  UPLOADS_DIR: "./uploads",
  TZ: "America/Caracas",
} as unknown as NodeJS.ProcessEnv;

describe("loadEnv", () => {
  it("acepta un entorno válido", () => {
    const env = loadEnv(base);
    expect(env.WHATSAPP_PROVIDER).toBe("fake");
    expect(env.UPLOADS_DIR).toBe("./uploads");
  });

  it("rechaza un secreto de sesión demasiado corto y lo nombra en el error", () => {
    expect(() => loadEnv({ ...base, SESSION_SECRET: "corto" })).toThrow(/SESSION_SECRET/);
  });

  it("rechaza un secreto de tickets demasiado corto y lo nombra en el error", () => {
    expect(() => loadEnv({ ...base, TICKET_SECRET: "corto" })).toThrow(/TICKET_SECRET/);
  });

  it("rechaza un proveedor de WhatsApp desconocido", () => {
    expect(() => loadEnv({ ...base, WHATSAPP_PROVIDER: "telegram" })).toThrow(/WHATSAPP_PROVIDER/);
  });

  it("rechaza una URL de base de datos malformada", () => {
    expect(() => loadEnv({ ...base, DATABASE_URL: "no-es-una-url" })).toThrow(/DATABASE_URL/);
  });

  it("aplica America/Caracas como zona horaria por defecto", () => {
    const { TZ: _omitida, ...sinZona } = base;
    expect(loadEnv(sinZona).TZ).toBe("America/Caracas");
  });
});
