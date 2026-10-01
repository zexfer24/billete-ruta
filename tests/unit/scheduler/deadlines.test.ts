import { describe, expect, it } from "vitest";
import * as passengerCopy from "@/components/passenger-copy";
import { cashCounterDeadline, paymentDeadline } from "@/modules/scheduler";

const AHORA = new Date("2026-10-01T00:19:00.000Z");
const MIN = 60_000;
const HORA = 60 * MIN;

function en(ms: number): Date {
  return new Date(AHORA.getTime() + ms);
}

describe("cashCounterDeadline", () => {
  it("vence 12 horas antes de la salida, igual que el barrido que libera el puesto", () => {
    expect(cashCounterDeadline(en(30 * HORA), AHORA)).toEqual(en(18 * HORA));
  });
});

describe("paymentDeadline", () => {
  it("una reserva sin pago vence a las 2 horas si el bus sale después", () => {
    expect(
      paymentDeadline({ status: "PENDIENTE_PAGO", departsAt: en(10 * HORA), expiresAt: en(2 * HORA) }, AHORA),
    ).toEqual({ at: en(2 * HORA), boundByDeparture: false });
  });

  it("si el bus sale en 39 min, el plazo es la salida", () => {
    expect(
      paymentDeadline({ status: "PENDIENTE_PAGO", departsAt: en(39 * MIN), expiresAt: en(2 * HORA) }, AHORA),
    ).toEqual({ at: en(39 * MIN), boundByDeparture: true });
  });

  it("la taquilla usa su propio plazo y no corre si ya está reconfirmada o vencida", () => {
    expect(paymentDeadline({ status: "PAGO_EN_SITIO", departsAt: en(30 * HORA), expiresAt: null }, AHORA)).toEqual({
      at: en(18 * HORA),
      boundByDeparture: false,
    });
    expect(
      paymentDeadline({ status: "PAGO_EN_SITIO", departsAt: en(30 * HORA), expiresAt: null, reconfirmedAt: AHORA }, AHORA),
    ).toBeNull();
    expect(paymentDeadline({ status: "PAGO_EN_SITIO", departsAt: en(10 * HORA), expiresAt: null }, AHORA)).toBeNull();
  });

  it("no hay plazo si ya pagó algo, si el plazo pasó o si el bus ya salió", () => {
    expect(paymentDeadline({ status: "ABONADA", departsAt: en(5 * HORA), expiresAt: en(HORA) }, AHORA)).toBeNull();
    expect(paymentDeadline({ status: "PENDIENTE_PAGO", departsAt: en(5 * HORA), expiresAt: en(-MIN) }, AHORA)).toBeNull();
    expect(paymentDeadline({ status: "PENDIENTE_PAGO", departsAt: en(-MIN), expiresAt: en(HORA) }, AHORA)).toBeNull();
  });

  it("la app del pasajero usa exactamente estas mismas funciones", () => {
    expect(passengerCopy.paymentDeadline).toBe(paymentDeadline);
    expect(passengerCopy.cashCounterDeadline).toBe(cashCounterDeadline);
  });
});
