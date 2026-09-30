import { describe, expect, it } from "vitest";
import { RESERVATION_STATUS_LABELS } from "@/lib/labels";
import {
  capitalize,
  currencyName,
  dayGroupLabel,
  detailLabel,
  isCopyableDetail,
  isInactiveReservation,
  noticeActionLabel,
  noticeTimeLabel,
  passengerStatusTone,
  paymentPhrase,
  reservationActionLabel,
  whenPhrase,
} from "@/components/passenger-copy";

// 2026-10-12 10:00 en Caracas (UTC-4).
const AHORA = new Date("2026-10-12T14:00:00.000Z");

describe("estados de reserva para el pasajero", () => {
  it("cada estado tiene tono, acción y frase", () => {
    for (const estado of Object.keys(RESERVATION_STATUS_LABELS)) {
      expect(passengerStatusTone(estado)).toBeTruthy();
      expect(reservationActionLabel(estado, "$ 10,00")).not.toBe("");
      expect(paymentPhrase(estado, "$ 10,00")).not.toBe("");
    }
  });

  it("los tonos dicen si falta pagar, si se espera algo o si está listo", () => {
    expect(passengerStatusTone("PENDIENTE_PAGO")).toBe("alerta");
    expect(passengerStatusTone("ABONADA")).toBe("alerta");
    expect(passengerStatusTone("EN_VALIDACION")).toBe("info");
    expect(passengerStatusTone("PAGO_EN_SITIO")).toBe("info");
    expect(passengerStatusTone("PAGADA")).toBe("exito");
    expect(passengerStatusTone("LIBERADA")).toBe("neutro");
    expect(passengerStatusTone("INVENTADO")).toBe("neutro");
  });

  it("la acción incluye el saldo cuando falta una parte", () => {
    expect(reservationActionLabel("PENDIENTE_PAGO", "$ 10,00")).toBe("Pagar mi pasaje");
    expect(reservationActionLabel("ABONADA", "$ 10,00")).toBe("Pagar $ 10,00 que faltan");
    expect(reservationActionLabel("PAGADA", "$ 0,00")).toBe("Ver mi ticket");
    expect(paymentPhrase("ABONADA", "$ 10,00")).toBe("Te faltan $ 10,00 para recibir tu ticket.");
  });

  it("solo las reservas que ya no sirven se muestran apagadas", () => {
    expect(isInactiveReservation("LIBERADA")).toBe(true);
    expect(isInactiveReservation("CANCELADA")).toBe(true);
    expect(isInactiveReservation("NO_SHOW")).toBe(true);
    expect(isInactiveReservation("ABORDADA")).toBe(false);
    expect(isInactiveReservation("PAGADA")).toBe(false);
  });
});

describe("horas con contexto", () => {
  it("dice hoy, mañana o la fecha, en 24 horas y hora de Caracas", () => {
    expect(whenPhrase(new Date("2026-10-12T18:30:00.000Z"), AHORA)).toBe("hoy a las 14:30");
    expect(whenPhrase(new Date("2026-10-13T12:00:00.000Z"), AHORA)).toBe("mañana a las 08:00");
    expect(whenPhrase(new Date("2026-10-20T23:15:00.000Z"), AHORA)).toBe("el 20/10 a las 19:15");
  });

  it("agrupa por día con Hoy y Ayer", () => {
    expect(dayGroupLabel(new Date("2026-10-12T13:00:00.000Z"), AHORA)).toBe("Hoy");
    expect(dayGroupLabel(new Date("2026-10-11T13:00:00.000Z"), AHORA)).toBe("Ayer");
    expect(dayGroupLabel(new Date("2026-10-01T13:00:00.000Z"), AHORA)).toBe("01/10/2026");
  });

  it("capitalize pone la primera letra en mayúscula", () => {
    expect(capitalize("hoy a las 10:00")).toBe("Hoy a las 10:00");
    expect(capitalize("")).toBe("");
  });
});

describe("avisos", () => {
  it("la hora del aviso dice qué significa", () => {
    const vence = new Date("2026-10-12T16:00:00.000Z");
    expect(noticeTimeLabel({ kind: "RESERVA_POR_LIBERAR", at: vence }, AHORA)).toBe("Vence hoy a las 12:00");
    expect(noticeTimeLabel({ kind: "COMPROBANTE_EN_VALIDACION", at: vence }, AHORA)).toBe(
      "Lo enviaste hoy a las 12:00",
    );
  });

  it("los avisos que no dependen de una hora no la muestran", () => {
    expect(noticeTimeLabel({ kind: "DOCUMENTO_FALTANTE", at: AHORA }, AHORA)).toBeNull();
    expect(noticeTimeLabel({ kind: "TICKET_LISTO", at: AHORA }, AHORA)).toBeNull();
  });

  it("cada tipo de aviso tiene una acción", () => {
    expect(noticeActionLabel("DOCUMENTO_FALTANTE")).toBe("Subir la foto");
    expect(noticeActionLabel("TICKET_LISTO")).toBe("Ver mi ticket");
  });
});

describe("datos de cobro", () => {
  it("traduce las claves técnicas a nombres legibles", () => {
    expect(detailLabel("banco")).toBe("Banco");
    expect(detailLabel("rif")).toBe("RIF");
    expect(detailLabel("wallet")).toBe("Billetera");
    expect(detailLabel("red")).toBe("Red");
    expect(detailLabel("nota")).toBe("Nota");
    expect(detailLabel("telefono")).toBe("Teléfono");
  });

  it("una clave desconocida se muestra legible", () => {
    expect(detailLabel("numero_de_cuenta")).toBe("Numero de cuenta");
  });

  it("las notas no se ofrecen para copiar", () => {
    expect(isCopyableDetail("nota")).toBe(false);
    expect(isCopyableDetail("wallet")).toBe(true);
  });

  it("nombra las monedas en palabras", () => {
    expect(currencyName("VES")).toBe("bolívares");
    expect(currencyName("USD")).toBe("dólares");
  });
});
