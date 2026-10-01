import { describe, expect, it } from "vitest";
import { tripMovementText } from "@/app/panel/_dashboard/movements";
import { porCobrarNowText } from "@/app/panel/_dashboard/text";

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

describe("porCobrarNowText", () => {
  it("dice que la cifra es en vivo y habla de las mismas reservas que cuenta", () => {
    expect(porCobrarNowText(0, 0)).toBe("Ahora mismo ninguna reserva debe dinero.");
    expect(porCobrarNowText(1, 0)).toBe("Ahora mismo, 1 reserva debe dinero y su salida aún no parte.");
    expect(porCobrarNowText(262, 0)).toBe("Ahora mismo, 262 reservas deben dinero y su salida aún no parte.");
    expect(porCobrarNowText(262, 36)).toBe(
      "Ahora mismo, 262 reservas deben dinero y su salida aún no parte. De ellas, 36 pagan en la taquilla.",
    );
    expect(porCobrarNowText(262, 1)).toBe(
      "Ahora mismo, 262 reservas deben dinero y su salida aún no parte. De ellas, 1 paga en la taquilla.",
    );
    expect(porCobrarNowText(3, 3)).toBe("Ahora mismo, 3 reservas deben dinero y su salida aún no parte. Todas pagan en la taquilla.");
    expect(porCobrarNowText(1, 1)).toBe("Ahora mismo, 1 reserva debe dinero y su salida aún no parte. Paga en la taquilla.");
    expect(porCobrarNowText(1250, 0)).toBe("Ahora mismo, 1.250 reservas deben dinero y su salida aún no parte.");
  });
});
