import { describe, expect, it } from "vitest";
import { describeActivity, type ActivityEntry } from "@/modules/reports";

/** Construye una entrada de bitácora con valores por defecto razonables. */
function entrada(overrides: Partial<ActivityEntry>): ActivityEntry {
  return {
    id: "1",
    at: new Date("2026-09-13T12:00:00.000Z"),
    actorType: "PANEL",
    actorName: "Ana Operadora",
    action: "RESERVA_CREADA",
    entityType: "Reservation",
    subject: "TR-0913-1PAX-AB12",
    after: {},
    ...overrides,
  };
}

describe("describeActivity", () => {
  it("RESERVA_CREADA por un operador de taquilla", () => {
    const { text, tone } = describeActivity(entrada({ action: "RESERVA_CREADA" }));
    expect(text).toBe("Ana Operadora vendió en taquilla la reserva TR-0913-1PAX-AB12");
    expect(tone).toBe("marca");
  });

  it("RESERVA_CREADA por el pasajero", () => {
    const { text, tone } = describeActivity(
      entrada({ action: "RESERVA_CREADA", actorType: "PASAJERO", actorName: null }),
    );
    expect(text).toBe("El pasajero creó la reserva TR-0913-1PAX-AB12");
    expect(tone).toBe("marca");
  });

  it("COMPROBANTE_CARGADO", () => {
    const { text, tone } = describeActivity(entrada({ action: "COMPROBANTE_CARGADO" }));
    expect(text).toBe("El pasajero cargó un comprobante en TR-0913-1PAX-AB12");
    expect(tone).toBe("marca");
  });

  it("PAGO_APROBADO", () => {
    const { text, tone } = describeActivity(entrada({ action: "PAGO_APROBADO" }));
    expect(text).toBe("Ana Operadora aprobó un pago de TR-0913-1PAX-AB12");
    expect(tone).toBe("exito");
  });

  it("PAGO_RECHAZADO", () => {
    const { text, tone } = describeActivity(entrada({ action: "PAGO_RECHAZADO" }));
    expect(text).toBe("Ana Operadora rechazó un comprobante de TR-0913-1PAX-AB12");
    expect(tone).toBe("peligro");
  });

  it("PAGO_EN_EXCESO", () => {
    const { text, tone } = describeActivity(entrada({ action: "PAGO_EN_EXCESO" }));
    expect(text).toBe("Se registró un pago en exceso en TR-0913-1PAX-AB12");
    expect(tone).toBe("alerta");
  });

  it("COBRO_EN_SITIO con importe", () => {
    const { text, tone } = describeActivity(
      entrada({ action: "COBRO_EN_SITIO", after: { amount: "10.00", currency: "USD" } }),
    );
    expect(text).toBe("Ana Operadora cobró en efectivo $ 10,00 en TR-0913-1PAX-AB12");
    expect(tone).toBe("exito");
  });

  it("COBRO_EN_SITIO sin importe", () => {
    const { text, tone } = describeActivity(entrada({ action: "COBRO_EN_SITIO", after: {} }));
    expect(text).toBe("Ana Operadora cobró en efectivo en TR-0913-1PAX-AB12");
    expect(tone).toBe("exito");
  });

  it("ABORDAJE_REGISTRADO", () => {
    const { text, tone } = describeActivity(entrada({ action: "ABORDAJE_REGISTRADO" }));
    expect(text).toBe("Ana Operadora registró el abordaje de TR-0913-1PAX-AB12");
    expect(tone).toBe("exito");
  });

  it("ESTADO_PAGADA", () => {
    const { text, tone } = describeActivity(entrada({ action: "ESTADO_PAGADA" }));
    expect(text).toBe("TR-0913-1PAX-AB12 quedó pagada y se emitió el ticket");
    expect(tone).toBe("exito");
  });

  it("ESTADO_LIBERADA", () => {
    const { text, tone } = describeActivity(entrada({ action: "ESTADO_LIBERADA" }));
    expect(text).toBe("Ana Operadora liberó la reserva TR-0913-1PAX-AB12");
    expect(tone).toBe("neutro");
  });

  it("ESTADO_CANCELADA", () => {
    const { text, tone } = describeActivity(entrada({ action: "ESTADO_CANCELADA" }));
    expect(text).toBe("Ana Operadora canceló la reserva TR-0913-1PAX-AB12");
    expect(tone).toBe("neutro");
  });

  it("ESTADO_NO_SHOW", () => {
    const { text, tone } = describeActivity(entrada({ action: "ESTADO_NO_SHOW" }));
    expect(text).toBe("TR-0913-1PAX-AB12 quedó como ausente");
    expect(tone).toBe("neutro");
  });

  it("otro ESTADO_<X> usa la etiqueta del estado", () => {
    const { text, tone } = describeActivity(entrada({ action: "ESTADO_ABONADA" }));
    expect(text).toBe("TR-0913-1PAX-AB12 pasó a Abonada");
    expect(tone).toBe("neutro");
  });

  it("SALIDA_CREADA con sujeto", () => {
    const { text, tone } = describeActivity(
      entrada({ action: "SALIDA_CREADA", entityType: "Departure", subject: "Ruta X · 13/09 08:00" }),
    );
    expect(text).toBe("Ana Operadora creó la salida Ruta X · 13/09 08:00");
    expect(tone).toBe("marca");
  });

  it("SALIDA_CREADA sin sujeto", () => {
    const { text, tone } = describeActivity(
      entrada({ action: "SALIDA_CREADA", entityType: "Departure", subject: null }),
    );
    expect(text).toBe("Ana Operadora creó una salida");
    expect(tone).toBe("marca");
  });

  it("EMBARQUE_INICIADO", () => {
    const { text, tone } = describeActivity(
      entrada({ action: "EMBARQUE_INICIADO", entityType: "Departure", subject: null }),
    );
    expect(text).toBe("Ana Operadora inició el embarque de una salida");
    expect(tone).toBe("alerta");
  });

  it("SALIDA_REGISTRADA", () => {
    const { text, tone } = describeActivity(
      entrada({
        action: "SALIDA_REGISTRADA",
        entityType: "Departure",
        subject: "Ruta X · 13/09 08:00",
      }),
    );
    expect(text).toBe("Ana Operadora registró la partida de Ruta X · 13/09 08:00");
    expect(tone).toBe("exito");
  });

  it("LLEGADA_REGISTRADA", () => {
    const { text, tone } = describeActivity(
      entrada({ action: "LLEGADA_REGISTRADA", entityType: "Departure", subject: null }),
    );
    expect(text).toBe("Ana Operadora registró la llegada de una salida");
    expect(tone).toBe("exito");
  });

  it("VEHICULO_CREADO", () => {
    const { text, tone } = describeActivity(
      entrada({ action: "VEHICULO_CREADO", entityType: "Vehicle", subject: "AA1234" }),
    );
    expect(text).toBe("Ana Operadora registró el vehículo AA1234");
    expect(tone).toBe("neutro");
  });

  it("VEHICULO_ACTUALIZADO", () => {
    const { text, tone } = describeActivity(
      entrada({ action: "VEHICULO_ACTUALIZADO", entityType: "Vehicle", subject: "AA1234" }),
    );
    expect(text).toBe("Ana Operadora actualizó el vehículo AA1234");
    expect(tone).toBe("neutro");
  });

  it("CHOFER_CREADO", () => {
    const { text, tone } = describeActivity(
      entrada({ action: "CHOFER_CREADO", entityType: "Driver", subject: "Juan Pérez" }),
    );
    expect(text).toBe("Ana Operadora registró al chofer Juan Pérez");
    expect(tone).toBe("neutro");
  });

  it("CHOFER_ACTUALIZADO", () => {
    const { text, tone } = describeActivity(
      entrada({ action: "CHOFER_ACTUALIZADO", entityType: "Driver", subject: "Juan Pérez" }),
    );
    expect(text).toBe("Ana Operadora actualizó al chofer Juan Pérez");
    expect(tone).toBe("neutro");
  });

  it("CUENTA_CREADA_EN_TAQUILLA", () => {
    const { text, tone } = describeActivity(
      entrada({ action: "CUENTA_CREADA_EN_TAQUILLA", entityType: "PassengerAccount", subject: null }),
    );
    expect(text).toBe("Ana Operadora registró un pasajero en taquilla");
    expect(tone).toBe("neutro");
  });

  it("CUENTA_ACTIVADA", () => {
    const { text, tone } = describeActivity(
      entrada({
        action: "CUENTA_ACTIVADA",
        actorType: "PASAJERO",
        actorName: null,
        entityType: "PassengerAccount",
        subject: null,
      }),
    );
    expect(text).toBe("El pasajero activó su cuenta");
    expect(tone).toBe("neutro");
  });

  it("acción desconocida", () => {
    const { text, tone } = describeActivity(
      entrada({ action: "ALGO_NUEVO", entityType: "Reservation", subject: null }),
    );
    expect(text).toBe("Ana Operadora registró un cambio en el sistema");
    expect(tone).toBe("neutro");
  });

  it("actor nulo cae en «Un operador»", () => {
    const { text } = describeActivity(entrada({ action: "PAGO_APROBADO", actorName: null }));
    expect(text).toBe("Un operador aprobó un pago de TR-0913-1PAX-AB12");
  });

  it("SISTEMA se describe como «El sistema»", () => {
    const { text } = describeActivity(
      entrada({ action: "VEHICULO_CREADO", actorType: "SISTEMA", entityType: "Vehicle", subject: "AA1234" }),
    );
    expect(text).toBe("El sistema registró el vehículo AA1234");
  });

  it("ningún texto tiene doble espacio ni espacio antes del punto final, y no termina en punto", () => {
    const acciones: ActivityEntry["action"][] = [
      "RESERVA_CREADA",
      "COMPROBANTE_CARGADO",
      "PAGO_APROBADO",
      "PAGO_RECHAZADO",
      "PAGO_EN_EXCESO",
      "COBRO_EN_SITIO",
      "ABORDAJE_REGISTRADO",
      "ESTADO_PAGADA",
      "ESTADO_LIBERADA",
      "ESTADO_CANCELADA",
      "ESTADO_NO_SHOW",
      "ESTADO_ABONADA",
      "SALIDA_CREADA",
      "EMBARQUE_INICIADO",
      "SALIDA_REGISTRADA",
      "LLEGADA_REGISTRADA",
      "CUENTA_CREADA_EN_TAQUILLA",
      "CUENTA_ACTIVADA",
      "ALGO_NUEVO",
    ];
    for (const action of acciones) {
      const { text } = describeActivity(entrada({ action }));
      expect(text).not.toMatch(/  /);
      expect(text).not.toMatch(/ \.$/);
      expect(text.endsWith(".")).toBe(false);
    }
  });

  it("nunca imprime la cédula ni el teléfono presentes en after", () => {
    const { text } = describeActivity(
      entrada({
        action: "COBRO_EN_SITIO",
        after: { idNumber: "V12345678", phone: "+584121112233" },
      }),
    );
    expect(text).not.toContain("V12345678");
    expect(text).not.toContain("+584121112233");
  });
});
