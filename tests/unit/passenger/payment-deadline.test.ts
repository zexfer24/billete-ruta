import { describe, expect, it } from "vitest";
import {
  deadlineBeforePhrase,
  deadlinePhrase,
  estimatedOnlineDeadline,
  heroDepartsSoon,
  heroDepartureTitle,
  paymentDeadline,
  pickHeroReservation,
  ticketDeadline,
  ticketDeadlineLabel,
  type HeroCandidate,
} from "@/components/passenger-copy";

// 2026-09-30 20:19 en Caracas (UTC-4).
const AHORA = new Date("2026-10-01T00:19:00.000Z");
const MIN = 60_000;
const HORA = 60 * MIN;

function en(ms: number): Date {
  return new Date(AHORA.getTime() + ms);
}

describe("paymentDeadline", () => {
  it("una reserva sin pago vence a las 2 horas si el bus sale después", () => {
    const plazo = paymentDeadline({ status: "PENDIENTE_PAGO", departsAt: en(10 * HORA), expiresAt: en(2 * HORA) }, AHORA);
    expect(plazo).toEqual({ at: en(2 * HORA), boundByDeparture: false });
  });

  it("si el bus sale en 39 min, el plazo es la salida y no las 2 horas", () => {
    const plazo = paymentDeadline({ status: "PENDIENTE_PAGO", departsAt: en(39 * MIN), expiresAt: en(2 * HORA) }, AHORA);
    expect(plazo).toEqual({ at: en(39 * MIN), boundByDeparture: true });
    expect(deadlinePhrase(plazo!, AHORA)).toBe("hoy a las 20:58, cuando sale el bus");
  });

  it("la taquilla vence 12 horas antes de salir, salvo que esté reconfirmada", () => {
    const salida = en(30 * HORA);
    expect(paymentDeadline({ status: "PAGO_EN_SITIO", departsAt: salida, expiresAt: null }, AHORA)).toEqual({
      at: en(18 * HORA),
      boundByDeparture: false,
    });
    expect(
      paymentDeadline({ status: "PAGO_EN_SITIO", departsAt: salida, expiresAt: null, reconfirmedAt: AHORA }, AHORA),
    ).toBeNull();
  });

  it("no hay plazo si ya pagó algo, si está en revisión, si ya venció o si el bus ya salió", () => {
    expect(paymentDeadline({ status: "ABONADA", departsAt: en(5 * HORA), expiresAt: en(HORA) }, AHORA)).toBeNull();
    expect(paymentDeadline({ status: "EN_VALIDACION", departsAt: en(5 * HORA), expiresAt: en(HORA) }, AHORA)).toBeNull();
    expect(paymentDeadline({ status: "PENDIENTE_PAGO", departsAt: en(5 * HORA), expiresAt: en(-MIN) }, AHORA)).toBeNull();
    expect(paymentDeadline({ status: "PENDIENTE_PAGO", departsAt: en(-MIN), expiresAt: en(HORA) }, AHORA)).toBeNull();
  });

  it("antes de reservar estima 2 horas o la salida, lo que llegue antes", () => {
    expect(estimatedOnlineDeadline(en(39 * MIN), AHORA)).toEqual({ at: en(39 * MIN), boundByDeparture: true });
    expect(estimatedOnlineDeadline(en(5 * HORA), AHORA)).toEqual({ at: en(2 * HORA), boundByDeparture: false });
  });
});

describe("ticketDeadline", () => {
  it("el ticket resalta la taquilla solo si vence dentro de 24 horas", () => {
    expect(ticketDeadline({ status: "PAGO_EN_SITIO", departsAt: en(30 * HORA), expiresAt: null }, AHORA)).not.toBeNull();
    expect(ticketDeadline({ status: "PAGO_EN_SITIO", departsAt: en(72 * HORA), expiresAt: null }, AHORA)).toBeNull();
  });

  it("dice qué hacer y hasta cuándo, con el día separado de la hora", () => {
    const plazo = { at: en(43 * MIN), boundByDeparture: false };
    expect(ticketDeadlineLabel("PENDIENTE_PAGO", plazo, AHORA)).toBe("Paga hoy antes de las 21:02");
    expect(ticketDeadlineLabel("PAGO_EN_SITIO", plazo, AHORA)).toBe("Paga en la taquilla hoy antes de las 21:02");
  });
});

describe("deadlineBeforePhrase", () => {
  it("nunca dice «antes de hoy»: el día va antes y la hora detrás de «antes de las»", () => {
    expect(deadlineBeforePhrase({ at: en(43 * MIN), boundByDeparture: false }, AHORA)).toBe("hoy antes de las 21:02");
    expect(deadlineBeforePhrase({ at: en(18 * HORA), boundByDeparture: false }, AHORA)).toBe(
      "mañana antes de las 14:19",
    );
    // 2026-10-12 08:00 en Caracas.
    expect(deadlineBeforePhrase({ at: new Date("2026-10-12T12:00:00.000Z"), boundByDeparture: false }, AHORA)).toBe(
      "el lun 12 oct antes de las 08:00",
    );
  });

  it("si el plazo lo pone la salida, lo dice", () => {
    expect(deadlineBeforePhrase({ at: en(39 * MIN), boundByDeparture: true }, AHORA)).toBe(
      "hoy antes de las 20:58, cuando sale el bus",
    );
  });
});

describe("pickHeroReservation", () => {
  const merida: HeroCandidate = { code: "TR-A", status: "EN_VALIDACION", departsAt: en(5 * HORA), expiresAt: null };
  const barinas: HeroCandidate = {
    code: "TR-B",
    status: "PENDIENTE_PAGO",
    departsAt: en(11 * HORA),
    expiresAt: en(43 * MIN),
  };

  it("sin reservas no hay héroe", () => {
    expect(pickHeroReservation([], AHORA)).toBeNull();
  });

  it("si el viaje más cercano no pide nada, sube la reserva que se libera pronto", () => {
    const eleccion = pickHeroReservation([merida, barinas], AHORA);
    expect(eleccion).toEqual({ hero: barinas, soonest: merida, promoted: true });
  });

  it("una pagada en parte que sale en 5 horas cede ante un puesto que se libera en 43 min", () => {
    const abonada: HeroCandidate = { ...merida, status: "ABONADA" };
    expect(pickHeroReservation([barinas, abonada], AHORA)).toEqual({ hero: barinas, soonest: abonada, promoted: true });
  });

  it("una pagada en parte que sale dentro de 3 horas no cede", () => {
    const abonada: HeroCandidate = { ...merida, status: "ABONADA", departsAt: en(2 * HORA) };
    expect(pickHeroReservation([barinas, abonada], AHORA)).toEqual({ hero: abonada, soonest: abonada, promoted: false });
  });

  it("un pago en la taquilla lejano cede ante una reserva sin pago", () => {
    const taquilla: HeroCandidate = { code: "TR-C", status: "PAGO_EN_SITIO", departsAt: en(84 * HORA), expiresAt: null };
    const sinPago: HeroCandidate = { ...barinas, departsAt: en(90 * HORA) };
    expect(pickHeroReservation([taquilla, sinPago], AHORA)).toEqual({ hero: sinPago, soonest: taquilla, promoted: true });
  });

  it("entre dos sin pago sube la que vence antes, aunque salga después", () => {
    const cercana: HeroCandidate = { code: "TR-F", status: "PENDIENTE_PAGO", departsAt: en(6 * HORA), expiresAt: en(HORA) };
    expect(pickHeroReservation([cercana, barinas], AHORA)).toEqual({ hero: barinas, soonest: cercana, promoted: true });
    const tardia: HeroCandidate = { ...barinas, expiresAt: en(90 * MIN) };
    expect(pickHeroReservation([cercana, tardia], AHORA)?.promoted).toBe(false);
  });

  it("un ticket pagado que sale dentro de 3 horas nunca cede su lugar", () => {
    const pagada: HeroCandidate = { ...merida, status: "PAGADA", departsAt: en(2 * HORA) };
    expect(pickHeroReservation([barinas, pagada], AHORA)?.hero).toBe(pagada);
  });

  it("un ticket pagado que sale más tarde cede su lugar a un plazo de pago", () => {
    const pagada: HeroCandidate = { ...merida, status: "PAGADA", departsAt: en(4 * HORA) };
    expect(pickHeroReservation([pagada, barinas], AHORA)?.hero).toBe(barinas);
  });

  it("entre varias con plazo sube la que vence antes", () => {
    const taquilla: HeroCandidate = { code: "TR-C", status: "PAGO_EN_SITIO", departsAt: en(14 * HORA), expiresAt: null };
    expect(pickHeroReservation([merida, taquilla, barinas], AHORA)?.hero).toBe(barinas);
  });

  it("sin otra con plazo, el héroe sigue siendo el viaje más cercano", () => {
    const otra: HeroCandidate = { ...merida, code: "TR-D", status: "PAGADA", departsAt: en(20 * HORA) };
    expect(pickHeroReservation([otra, merida], AHORA)).toEqual({ hero: merida, soonest: merida, promoted: false });
  });

  it("un viaje en revisión que sale dentro de 3 horas no cede su lugar", () => {
    const pronto: HeroCandidate = { ...merida, departsAt: en(34 * MIN) };
    expect(pickHeroReservation([barinas, pronto], AHORA)).toEqual({ hero: pronto, soonest: pronto, promoted: false });
  });

  it("un pago en la taquilla que vence en más de 24 horas no sube", () => {
    const taquilla: HeroCandidate = { code: "TR-C", status: "PAGO_EN_SITIO", departsAt: en(84 * HORA), expiresAt: null };
    expect(pickHeroReservation([merida, taquilla], AHORA)).toEqual({ hero: merida, soonest: merida, promoted: false });
  });

  it("sin plazos que apuren, sube la pagada en parte que sale dentro de 24 horas", () => {
    const abonada: HeroCandidate = { code: "TR-E", status: "ABONADA", departsAt: en(22 * HORA), expiresAt: null };
    expect(pickHeroReservation([merida, abonada], AHORA)).toEqual({ hero: abonada, soonest: merida, promoted: true });
    const lejana: HeroCandidate = { ...abonada, departsAt: en(30 * HORA) };
    expect(pickHeroReservation([merida, lejana], AHORA)?.promoted).toBe(false);
  });

  it("un plazo de pago sube antes que una pagada en parte", () => {
    const abonada: HeroCandidate = { code: "TR-E", status: "ABONADA", departsAt: en(6 * HORA), expiresAt: null };
    expect(pickHeroReservation([merida, abonada, barinas], AHORA)?.hero).toBe(barinas);
  });

  it("en una misma salida va la más urgente y, a igual urgencia, la de código menor", () => {
    const a: HeroCandidate = { code: "TR-2", status: "PAGADA", departsAt: en(HORA), expiresAt: null };
    const b: HeroCandidate = { code: "TR-1", status: "ABONADA", departsAt: en(HORA), expiresAt: null };
    const c: HeroCandidate = { code: "TR-0", status: "ABONADA", departsAt: en(HORA), expiresAt: null };
    expect(pickHeroReservation([a, b, c], AHORA)?.hero).toBe(c);
  });
});

describe("heroDepartureTitle", () => {
  it("dice cuánto falta para salir, en minutos o con la hora", () => {
    expect(heroDepartureTitle(en(34 * MIN), AHORA)).toBe("Tu viaje sale en 34 min");
    expect(heroDepartureTitle(en(30 * 1000), AHORA)).toBe("Tu viaje sale ahora");
    expect(heroDepartureTitle(en(2 * HORA), AHORA)).toBe("Tu viaje sale hoy a las 22:19");
    expect(heroDepartureTitle(en(4 * HORA), AHORA)).toBe("Tu viaje sale mañana a las 00:19");
  });

  it("solo cuenta como pronto lo que sale dentro de 3 horas", () => {
    expect(heroDepartsSoon(en(3 * HORA), AHORA)).toBe(true);
    expect(heroDepartsSoon(en(3 * HORA + MIN), AHORA)).toBe(false);
    expect(heroDepartsSoon(en(-MIN), AHORA)).toBe(false);
  });
});
