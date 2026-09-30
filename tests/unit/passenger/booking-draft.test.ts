import { describe, expect, it } from "vitest";
import { parseBookingDraft } from "@/app/mi/reservar/draft";

const AHORA = 1_800_000_000_000;
const CUENTA = "cuenta-1";

function borrador(cambios: Record<string, unknown> = {}): string {
  return JSON.stringify({
    version: 2,
    accountId: CUENTA,
    savedAt: AHORA - 60_000,
    step: 3,
    departureId: "salida-1",
    companions: [{ fullName: "Ana Pérez", idNumber: "V12345678", birthYear: "1990" }],
    policiesAccepted: true,
    paymentMethodId: null,
    ...cambios,
  });
}

describe("parseBookingDraft", () => {
  it("recupera un borrador reciente y bien formado", () => {
    const draft = parseBookingDraft(borrador(), AHORA, CUENTA);
    expect(draft).not.toBeNull();
    expect(draft?.step).toBe(3);
    expect(draft?.companions).toHaveLength(1);
  });

  it("descarta un borrador de más de dos horas", () => {
    expect(parseBookingDraft(borrador({ savedAt: AHORA - 2 * 60 * 60 * 1000 - 1 }), AHORA, CUENTA)).toBeNull();
  });

  it("descarta textos que no son un borrador válido", () => {
    expect(parseBookingDraft(null, AHORA, CUENTA)).toBeNull();
    expect(parseBookingDraft("no es json", AHORA, CUENTA)).toBeNull();
    expect(parseBookingDraft(borrador({ version: 1 }), AHORA, CUENTA)).toBeNull();
    expect(parseBookingDraft(borrador({ step: 7 }), AHORA, CUENTA)).toBeNull();
    expect(parseBookingDraft(borrador({ departureId: "" }), AHORA, CUENTA)).toBeNull();
    expect(parseBookingDraft(borrador({ companions: [{ fullName: 1 }] }), AHORA, CUENTA)).toBeNull();
    expect(parseBookingDraft(borrador({ paymentMethodId: 5 }), AHORA, CUENTA)).toBeNull();
  });

  it("descarta el borrador de otra cuenta o sin cuenta", () => {
    expect(parseBookingDraft(borrador(), AHORA, "cuenta-2")).toBeNull();
    expect(parseBookingDraft(borrador({ accountId: undefined }), AHORA, CUENTA)).toBeNull();
    expect(parseBookingDraft(borrador({ accountId: "" }), AHORA, "")).toBeNull();
  });

  it("no acepta más de cinco acompañantes", () => {
    const seis = Array.from({ length: 6 }, () => ({ fullName: "A", idNumber: "V1", birthYear: "1990" }));
    expect(parseBookingDraft(borrador({ companions: seis }), AHORA, CUENTA)).toBeNull();
  });
});
