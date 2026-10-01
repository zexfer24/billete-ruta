import { describe, expect, it } from "vitest";
import { manifestSummary, passengerBoardingState } from "@/app/panel/_shared/manifest-summary";

const A_BORDO = { boardedAt: new Date("2026-09-30T14:00:00Z") };
const SIN_SUBIR = { boardedAt: null };

describe("manifestSummary", () => {
  it("cuenta abordados, pendientes y puestos libres", () => {
    const resumen = manifestSummary({
      capacity: 10,
      reservations: [
        { status: "ABORDADA", passengers: [A_BORDO, A_BORDO] },
        { status: "PAGADA", passengers: [SIN_SUBIR, SIN_SUBIR, SIN_SUBIR] },
        { status: "PAGO_EN_SITIO", passengers: [SIN_SUBIR] },
        { status: "CANCELADA", passengers: [SIN_SUBIR, SIN_SUBIR] },
      ],
    });
    expect(resumen).toMatchObject({ boarded: 2, pending: 4, expected: 6, free: 4 });
  });

  it("anticipa qué reservas quedarán como ausentes y cuáles se cancelarán", () => {
    const resumen = manifestSummary({
      capacity: 20,
      reservations: [
        { status: "PAGADA", passengers: [SIN_SUBIR, SIN_SUBIR] },
        { status: "PAGADA", passengers: [SIN_SUBIR] },
        { status: "ABONADA", passengers: [SIN_SUBIR] },
        { status: "PENDIENTE_PAGO", passengers: [SIN_SUBIR, SIN_SUBIR] },
        { status: "ABORDADA", passengers: [A_BORDO] },
        { status: "NO_SHOW", passengers: [SIN_SUBIR] },
      ],
    });
    expect(resumen).toMatchObject({
      noShowReservations: 2,
      noShowPassengers: 3,
      cancelReservations: 2,
      cancelPassengers: 3,
    });
  });

  it("un pasajero sin marcar de una reserva ya abordada no cuenta como pendiente", () => {
    const resumen = manifestSummary({
      capacity: 4,
      reservations: [{ status: "ABORDADA", passengers: [A_BORDO, SIN_SUBIR] }],
    });
    expect(resumen).toMatchObject({ boarded: 1, pending: 0, expected: 1, free: 2 });
  });

  it("cuenta por separado a quienes todavía deben pagar y no pueden subir", () => {
    const resumen = manifestSummary({
      capacity: 20,
      reservations: [
        { status: "PAGADA", passengers: [SIN_SUBIR, SIN_SUBIR] },
        { status: "PAGO_EN_SITIO", passengers: [SIN_SUBIR] },
        { status: "ABONADA", passengers: [SIN_SUBIR, SIN_SUBIR] },
        { status: "EN_VALIDACION", passengers: [SIN_SUBIR] },
        { status: "PENDIENTE_PAGO", passengers: [SIN_SUBIR] },
        { status: "LIBERADA", passengers: [SIN_SUBIR] },
      ],
    });
    // PAGO_EN_SITIO sí puede subir (el escáner lo deja pasar), así que no cuenta.
    expect(resumen).toMatchObject({ pending: 7, unpaidPassengers: 4 });
  });

  it("los puestos libres nunca bajan de cero", () => {
    const resumen = manifestSummary({
      capacity: 1,
      reservations: [{ status: "PAGADA", passengers: [SIN_SUBIR, SIN_SUBIR] }],
    });
    expect(resumen.free).toBe(0);
  });
});

describe("passengerBoardingState", () => {
  it("distingue a bordo, por abordar y sin viaje", () => {
    expect(passengerBoardingState("ABORDADA", A_BORDO.boardedAt)).toBe("a-bordo");
    expect(passengerBoardingState("PAGADA", null)).toBe("por-abordar");
    expect(passengerBoardingState("PAGO_EN_SITIO", null)).toBe("por-abordar");
    expect(passengerBoardingState("ABORDADA", null)).toBe("no-viaja");
    expect(passengerBoardingState("CANCELADA", null)).toBe("no-viaja");
    expect(passengerBoardingState("NO_SHOW", null)).toBe("no-viaja");
  });
});
