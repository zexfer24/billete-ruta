/** Tono visual asociado a un estado, para colorear pastillas (`Pill`). */
export type StatusTone = "marca" | "exito" | "alerta" | "peligro" | "neutro";

/** Los nueve estados de reserva en español, iguales a los usados en las páginas del pasajero. */
export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  PENDIENTE_PAGO: "Pendiente de pago",
  EN_VALIDACION: "En validación",
  ABONADA: "Abonada",
  PAGADA: "Pagada",
  PAGO_EN_SITIO: "Pago en sitio",
  LIBERADA: "Liberada",
  CANCELADA: "Cancelada",
  ABORDADA: "Abordada",
  NO_SHOW: "No se presentó",
};

/** Texto en español de un estado de reserva; un estado desconocido devuelve su propio nombre. */
export function reservationStatusLabel(status: string): string {
  return RESERVATION_STATUS_LABELS[status] ?? status;
}

const RESERVATION_STATUS_TONES: Record<string, StatusTone> = {
  PAGADA: "exito",
  ABORDADA: "exito",
  EN_VALIDACION: "marca",
  ABONADA: "marca",
  PAGO_EN_SITIO: "marca",
  PENDIENTE_PAGO: "alerta",
  LIBERADA: "neutro",
  CANCELADA: "neutro",
  NO_SHOW: "neutro",
};

/** Tono de pastilla de un estado de reserva; un estado desconocido cae en "neutro". */
export function reservationStatusTone(status: string): StatusTone {
  return RESERVATION_STATUS_TONES[status] ?? "neutro";
}

/** Los tres estados de un comprobante de pago, en español. */
export const PROOF_STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente de revisión",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};

/** Los cinco estados de MessageStatus (prisma/schema.prisma), en español. */
export const MESSAGE_STATUS_LABELS: Record<string, string> = {
  ENCOLADO: "Encolado",
  ENVIADO: "Enviado",
  ENTREGADO: "Entregado",
  LEIDO: "Leído",
  FALLIDO: "Fallido",
};

const MESSAGE_STATUS_TONES: Record<string, StatusTone> = {
  ENVIADO: "exito",
  ENTREGADO: "exito",
  LEIDO: "exito",
  ENCOLADO: "alerta",
  FALLIDO: "peligro",
};

/** Tono de pastilla de un estado de mensaje; un estado desconocido cae en "neutro". */
export function messageStatusTone(status: string): StatusTone {
  return MESSAGE_STATUS_TONES[status] ?? "neutro";
}
