import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ForbiddenError } from "@/modules/auth";
import {
  DepartureClosedError,
  InvalidTransitionError,
  NoSeatsAvailableError,
  NotOwnerError,
  ValidationError,
} from "@/modules/booking";
import { panelFeedbackUrl, userFacingMessage } from "@/app/panel/feedback";

describe("userFacingMessage", () => {
  it("traduce ValidationError con su propio texto", () => {
    const error = new ValidationError("La placa debe tener entre 5 y 10 caracteres.");
    expect(userFacingMessage(error)).toBe("La placa debe tener entre 5 y 10 caracteres.");
  });

  it("traduce NoSeatsAvailableError con su propio texto", () => {
    const error = new NoSeatsAvailableError(0);
    expect(userFacingMessage(error)).toBe(error.message);
  });

  it("traduce DepartureClosedError con su propio texto", () => {
    const error = new DepartureClosedError();
    expect(userFacingMessage(error)).toBe("Esta salida ya no admite reservas.");
  });

  it("traduce NotOwnerError con su propio texto", () => {
    const error = new NotOwnerError();
    expect(userFacingMessage(error)).toBe("Esta reserva no pertenece a tu cuenta.");
  });

  it("traduce InvalidTransitionError a un mensaje fijo", () => {
    const error = new InvalidTransitionError("PAGADA", "PENDIENTE_PAGO");
    expect(userFacingMessage(error)).toBe("La reserva ya no admite este cambio.");
  });

  it("traduce ForbiddenError a un mensaje fijo", () => {
    const error = new ForbiddenError("OPERADOR", "payments.review");
    expect(userFacingMessage(error)).toBe("No tienes permiso para esta operación.");
  });

  it("traduce un ZodError con el texto del primer problema", () => {
    const resultado = z.string().min(4, "Indica el motivo del rechazo (mínimo 4 caracteres).").safeParse("a");
    if (resultado.success) throw new Error("se esperaba que la validación fallara");
    expect(userFacingMessage(resultado.error)).toBe(
      "Indica el motivo del rechazo (mínimo 4 caracteres).",
    );
  });

  it("un error genérico no se traduce, para que la acción lo relance", () => {
    expect(userFacingMessage(new Error("cualquier cosa"))).toBeNull();
  });

  it("un valor que no es un error tampoco se traduce", () => {
    expect(userFacingMessage("cadena cualquiera")).toBeNull();
  });
});

describe("panelFeedbackUrl", () => {
  it("arma la URL conservando los parámetros dados", () => {
    expect(panelFeedbackUrl("/panel/pagos", { pagina: 2, comprobante: "abc-123" })).toBe(
      "/panel/pagos?pagina=2&comprobante=abc-123",
    );
  });

  it("omite los valores vacíos, nulos o indefinidos", () => {
    expect(
      panelFeedbackUrl("/panel/pagos", {
        pagina: undefined,
        comprobante: null,
        error: "",
        ok: "cobro",
      }),
    ).toBe("/panel/pagos?ok=cobro");
  });

  it("sin parámetros devuelve solo la ruta", () => {
    expect(panelFeedbackUrl("/panel/salidas", {})).toBe("/panel/salidas");
  });
});
