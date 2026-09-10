import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  getEnv: () => ({ TICKET_SECRET: "secreto-de-tickets-de-32-caracteres" }),
}));

const { signTicketCode, verifyTicketQr } = await import("@/modules/tickets/qr");

const SERIAL = "TR-0815-4PAX-K7Q2";

describe("signTicketCode", () => {
  it("produce el serial y una firma de dieciséis caracteres base32", () => {
    const [code, firma] = signTicketCode(SERIAL).split(".");
    expect(code).toBe(SERIAL);
    expect(firma).toHaveLength(16);
    expect(firma).toMatch(/^[A-Z2-7]{16}$/);
  });

  it("es determinista", () => {
    expect(signTicketCode(SERIAL)).toBe(signTicketCode(SERIAL));
  });

  it("produce firmas distintas para seriales distintos", () => {
    expect(signTicketCode(SERIAL)).not.toBe(signTicketCode("TR-0815-4PAX-K7Q3"));
  });
});

describe("verifyTicketQr", () => {
  it("valida un código íntegro", () => {
    expect(verifyTicketQr(signTicketCode(SERIAL))).toEqual({ valid: true, code: SERIAL });
  });

  it("rechaza una firma alterada en un solo carácter", () => {
    const payload = signTicketCode(SERIAL);
    const alterado = payload.slice(0, -1) + (payload.endsWith("A") ? "B" : "A");
    expect(verifyTicketQr(alterado)).toEqual({ valid: false, code: null });
  });

  it("rechaza la firma de otro serial pegada a un serial distinto", () => {
    const firma = signTicketCode(SERIAL).split(".")[1];
    expect(verifyTicketQr(`TR-0815-6PAX-K7Q2.${firma}`)).toEqual({ valid: false, code: null });
  });

  it("rechaza contenidos malformados", () => {
    for (const malo of ["", "sin-punto", "a.b.c", ".", `${SERIAL}.`, `${SERIAL}.CORTA`]) {
      expect(verifyTicketQr(malo).valid).toBe(false);
    }
  });
});
