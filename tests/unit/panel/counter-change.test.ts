import { describe, expect, it } from "vitest";
import { changeFromReceived } from "@/app/panel/taquilla/change";

describe("changeFromReceived", () => {
  it("monto exacto: vuelto de 0 centavos", () => {
    expect(changeFromReceived("100", "100")).toEqual({ kind: "vuelto", cents: 0 });
  });

  it("recibido mayor: da vuelto", () => {
    expect(changeFromReceived("150", "120.50")).toEqual({ kind: "vuelto", cents: 2950 });
  });

  it("recibido menor: faltan centavos", () => {
    expect(changeFromReceived("50", "75.25")).toEqual({ kind: "faltan", cents: 2525 });
  });

  it("acepta coma decimal", () => {
    expect(changeFromReceived("50,5", "50")).toEqual({ kind: "vuelto", cents: 50 });
  });

  it("vacío es inválido", () => {
    expect(changeFromReceived("", "100")).toEqual({ kind: "invalido", cents: 0 });
  });

  it("no numérico es inválido", () => {
    expect(changeFromReceived("abc", "100")).toEqual({ kind: "invalido", cents: 0 });
  });

  it("sin errores de coma flotante: 0.3 recibido contra 0.1 debido da vuelto de 20 centavos", () => {
    expect(changeFromReceived("0.3", "0.1")).toEqual({ kind: "vuelto", cents: 20 });
  });
});
