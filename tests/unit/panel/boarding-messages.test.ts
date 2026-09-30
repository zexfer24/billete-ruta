import { describe, expect, it } from "vitest";
import { boardingErrorMessage } from "@/app/panel/abordaje/messages";

describe("boardingErrorMessage", () => {
  it("nunca muestra el estado técnico de la reserva", () => {
    for (const estado of ["ABONADA", "PENDIENTE_PAGO", "EN_VALIDACION", "ABORDADA", "CANCELADA", "LIBERADA", "NO_SHOW"]) {
      const mensaje = boardingErrorMessage(`La reserva está en estado ${estado} y no puede abordar.`);
      expect(mensaje).not.toContain(estado);
    }
  });

  it("explica qué hacer si falta pagar", () => {
    const mensaje = boardingErrorMessage("La reserva está en estado ABONADA y no puede abordar.");
    expect(mensaje).toContain("Abonada");
    expect(mensaje).toContain("Pasajeros y pagos");
  });

  it("avisa que el ticket ya se usó", () => {
    expect(boardingErrorMessage("La reserva está en estado ABORDADA y no puede abordar.")).toMatch(/ya se usó/);
  });

  it("dice que una reserva sin efecto no puede viajar", () => {
    expect(boardingErrorMessage("La reserva está en estado NO_SHOW y no puede abordar.")).toContain("No se presentó");
  });

  it("traduce los motivos fijos del dominio", () => {
    expect(boardingErrorMessage("No existe ninguna reserva con ese serial.")).toMatch(/No encontramos ningún ticket/);
    expect(boardingErrorMessage("Esa reserva es de otra salida.")).toMatch(/otra salida/);
    expect(boardingErrorMessage("Código QR inválido o alterado.")).toMatch(/Escribe a mano/);
  });

  it("deja igual un mensaje que no reconoce", () => {
    expect(boardingErrorMessage("Otro motivo.")).toBe("Otro motivo.");
  });
});
