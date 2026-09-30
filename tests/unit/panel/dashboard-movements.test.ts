import { describe, expect, it } from "vitest";
import { tripMovementText } from "@/app/panel/_dashboard/movements";
import { porCobrarDetail } from "@/app/panel/_dashboard/text";

// 14:40 UTC = 10:40 en Caracas (UTC−4).
const at = (hhmm: string) => new Date(`2026-09-30T${hhmm}:00Z`);

describe("tripMovementText", () => {
  it("sin hitos dice una sola vez que todavía no embarca", () => {
    expect(
      tripMovementText({ status: "PROGRAMADA", boardingStartedAt: null, departedAt: null, arrivedAt: null }),
    ).toBe("Todavía no embarca");
  });

  it("una salida cancelada sin hitos dice que no salió", () => {
    expect(
      tripMovementText({ status: "CANCELADA", boardingStartedAt: null, departedAt: null, arrivedAt: null }),
    ).toBe("No salió");
  });

  it("nombra solo los hitos que ya ocurrieron, en hora de Caracas", () => {
    expect(
      tripMovementText({
        status: "EN_RUTA",
        boardingStartedAt: at("14:40"),
        departedAt: at("15:05"),
        arrivedAt: null,
      }),
    ).toBe("Embarcó 10:40 · Partió 11:05");
    expect(
      tripMovementText({
        status: "FINALIZADA",
        boardingStartedAt: at("14:40"),
        departedAt: at("15:05"),
        arrivedAt: at("21:30"),
      }),
    ).toBe("Embarcó 10:40 · Partió 11:05 · Llegó 17:30");
  });
});

describe("porCobrarDetail", () => {
  it("habla de las mismas reservas que cuenta la cifra", () => {
    expect(porCobrarDetail(0, 0)).toBe("Ninguna reserva debe dinero");
    expect(porCobrarDetail(1, 0)).toBe("Debe dinero y su salida aún no parte");
    expect(porCobrarDetail(262, 0)).toBe("Deben dinero y su salida aún no parte");
    expect(porCobrarDetail(262, 36)).toBe("Deben dinero y su salida aún no parte. De ellas, 36 pagan en la taquilla.");
    expect(porCobrarDetail(262, 1)).toBe("Deben dinero y su salida aún no parte. De ellas, 1 paga en la taquilla.");
    expect(porCobrarDetail(3, 3)).toBe("Deben dinero y su salida aún no parte. Todas pagan en la taquilla.");
    expect(porCobrarDetail(1, 1)).toBe("Debe dinero y su salida aún no parte. Paga en la taquilla.");
  });
});
