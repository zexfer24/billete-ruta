import { describe, expect, it } from "vitest";
import {
  DEPARTURE_STATUS_LABELS,
  MESSAGE_STATUS_LABELS,
  PROOF_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
  SALES_CHANNEL_LABELS,
  UNIT_STATE_LABELS,
  departureStatusLabel,
  departureStatusTone,
  messageStatusTone,
  reservationStatusLabel,
  reservationStatusTone,
  salesChannelLabel,
  unitStateTone,
} from "@/lib/labels";

describe("reservationStatusLabel", () => {
  it("traduce los nueve estados de reserva", () => {
    expect(reservationStatusLabel("PENDIENTE_PAGO")).toBe("Pendiente de pago");
    expect(reservationStatusLabel("EN_VALIDACION")).toBe("En validación");
    expect(reservationStatusLabel("ABONADA")).toBe("Abonada");
    expect(reservationStatusLabel("PAGADA")).toBe("Pagada");
    expect(reservationStatusLabel("PAGO_EN_SITIO")).toBe("Pago en sitio");
    expect(reservationStatusLabel("LIBERADA")).toBe("Liberada");
    expect(reservationStatusLabel("CANCELADA")).toBe("Cancelada");
    expect(reservationStatusLabel("ABORDADA")).toBe("Abordada");
    expect(reservationStatusLabel("NO_SHOW")).toBe("No se presentó");
  });

  it("un estado desconocido devuelve el mismo texto", () => {
    expect(reservationStatusLabel("ESTADO_INVENTADO")).toBe("ESTADO_INVENTADO");
  });

  it("RESERVATION_STATUS_LABELS tiene exactamente los nueve estados", () => {
    expect(Object.keys(RESERVATION_STATUS_LABELS).sort()).toEqual(
      [
        "ABONADA",
        "ABORDADA",
        "CANCELADA",
        "EN_VALIDACION",
        "LIBERADA",
        "NO_SHOW",
        "PAGADA",
        "PAGO_EN_SITIO",
        "PENDIENTE_PAGO",
      ].sort(),
    );
  });
});

describe("reservationStatusTone", () => {
  it("PAGADA y ABORDADA son éxito", () => {
    expect(reservationStatusTone("PAGADA")).toBe("exito");
    expect(reservationStatusTone("ABORDADA")).toBe("exito");
  });

  it("EN_VALIDACION, ABONADA y PAGO_EN_SITIO son marca", () => {
    expect(reservationStatusTone("EN_VALIDACION")).toBe("marca");
    expect(reservationStatusTone("ABONADA")).toBe("marca");
    expect(reservationStatusTone("PAGO_EN_SITIO")).toBe("marca");
  });

  it("PENDIENTE_PAGO es alerta", () => {
    expect(reservationStatusTone("PENDIENTE_PAGO")).toBe("alerta");
  });

  it("LIBERADA, CANCELADA y NO_SHOW son neutro", () => {
    expect(reservationStatusTone("LIBERADA")).toBe("neutro");
    expect(reservationStatusTone("CANCELADA")).toBe("neutro");
    expect(reservationStatusTone("NO_SHOW")).toBe("neutro");
  });

  it("un estado desconocido devuelve tono neutro", () => {
    expect(reservationStatusTone("ESTADO_INVENTADO")).toBe("neutro");
  });
});

describe("PROOF_STATUS_LABELS", () => {
  it("traduce los tres estados de comprobante", () => {
    expect(PROOF_STATUS_LABELS.PENDIENTE).toBe("Pendiente de revisión");
    expect(PROOF_STATUS_LABELS.APROBADO).toBe("Aprobado");
    expect(PROOF_STATUS_LABELS.RECHAZADO).toBe("Rechazado");
  });
});

describe("MESSAGE_STATUS_LABELS", () => {
  it("traduce los cinco estados de MessageStatus", () => {
    expect(MESSAGE_STATUS_LABELS.ENCOLADO).toBe("Encolado");
    expect(MESSAGE_STATUS_LABELS.ENVIADO).toBe("Enviado");
    expect(MESSAGE_STATUS_LABELS.ENTREGADO).toBe("Entregado");
    expect(MESSAGE_STATUS_LABELS.LEIDO).toBe("Leído");
    expect(MESSAGE_STATUS_LABELS.FALLIDO).toBe("Fallido");
  });

  it("tiene exactamente los cinco estados del enum", () => {
    expect(Object.keys(MESSAGE_STATUS_LABELS).sort()).toEqual(
      ["ENCOLADO", "ENTREGADO", "ENVIADO", "FALLIDO", "LEIDO"].sort(),
    );
  });
});

describe("messageStatusTone", () => {
  it("ENVIADO, ENTREGADO y LEIDO son éxito", () => {
    expect(messageStatusTone("ENVIADO")).toBe("exito");
    expect(messageStatusTone("ENTREGADO")).toBe("exito");
    expect(messageStatusTone("LEIDO")).toBe("exito");
  });

  it("ENCOLADO es alerta", () => {
    expect(messageStatusTone("ENCOLADO")).toBe("alerta");
  });

  it("FALLIDO es peligro", () => {
    expect(messageStatusTone("FALLIDO")).toBe("peligro");
  });

  it("un estado desconocido devuelve tono neutro", () => {
    expect(messageStatusTone("ESTADO_INVENTADO")).toBe("neutro");
  });
});

describe("departureStatusLabel", () => {
  it("traduce los cinco estados de salida", () => {
    expect(departureStatusLabel("PROGRAMADA")).toBe("Programada");
    expect(departureStatusLabel("MANIFIESTO_CERRADO")).toBe("Embarcando");
    expect(departureStatusLabel("EN_RUTA")).toBe("En ruta");
    expect(departureStatusLabel("FINALIZADA")).toBe("Finalizada");
    expect(departureStatusLabel("CANCELADA")).toBe("Cancelada");
  });

  it("un estado desconocido devuelve el mismo texto", () => {
    expect(departureStatusLabel("ESTADO_INVENTADO")).toBe("ESTADO_INVENTADO");
  });

  it("DEPARTURE_STATUS_LABELS tiene exactamente los cinco estados", () => {
    expect(Object.keys(DEPARTURE_STATUS_LABELS).sort()).toEqual(
      ["CANCELADA", "EN_RUTA", "FINALIZADA", "MANIFIESTO_CERRADO", "PROGRAMADA"].sort(),
    );
  });
});

describe("departureStatusTone", () => {
  it("PROGRAMADA es marca", () => {
    expect(departureStatusTone("PROGRAMADA")).toBe("marca");
  });

  it("MANIFIESTO_CERRADO es alerta", () => {
    expect(departureStatusTone("MANIFIESTO_CERRADO")).toBe("alerta");
  });

  it("EN_RUTA es éxito", () => {
    expect(departureStatusTone("EN_RUTA")).toBe("exito");
  });

  it("FINALIZADA es neutro", () => {
    expect(departureStatusTone("FINALIZADA")).toBe("neutro");
  });

  it("CANCELADA es peligro", () => {
    expect(departureStatusTone("CANCELADA")).toBe("peligro");
  });

  it("un estado desconocido devuelve tono neutro", () => {
    expect(departureStatusTone("ESTADO_INVENTADO")).toBe("neutro");
  });
});

describe("UNIT_STATE_LABELS y unitStateTone", () => {
  it("traduce los cinco estados de unidad", () => {
    expect(UNIT_STATE_LABELS.EN_RUTA).toBe("En ruta");
    expect(UNIT_STATE_LABELS.EMBARCANDO).toBe("Embarcando");
    expect(UNIT_STATE_LABELS.ASIGNADO).toBe("Asignado");
    expect(UNIT_STATE_LABELS.DISPONIBLE).toBe("Disponible");
    expect(UNIT_STATE_LABELS.FUERA_DE_SERVICIO).toBe("Fuera de servicio");
  });

  it("EN_RUTA es éxito, EMBARCANDO alerta, ASIGNADO marca, DISPONIBLE neutro y FUERA_DE_SERVICIO peligro", () => {
    expect(unitStateTone("EN_RUTA")).toBe("exito");
    expect(unitStateTone("EMBARCANDO")).toBe("alerta");
    expect(unitStateTone("ASIGNADO")).toBe("marca");
    expect(unitStateTone("DISPONIBLE")).toBe("neutro");
    expect(unitStateTone("FUERA_DE_SERVICIO")).toBe("peligro");
  });
});

describe("SALES_CHANNEL_LABELS y salesChannelLabel", () => {
  it("traduce los dos canales de venta", () => {
    expect(SALES_CHANNEL_LABELS.APP).toBe("App");
    expect(SALES_CHANNEL_LABELS.TAQUILLA).toBe("Taquilla");
    expect(salesChannelLabel("APP")).toBe("App");
    expect(salesChannelLabel("TAQUILLA")).toBe("Taquilla");
  });

  it("un canal desconocido devuelve el mismo texto", () => {
    expect(salesChannelLabel("CANAL_INVENTADO")).toBe("CANAL_INVENTADO");
  });
});
