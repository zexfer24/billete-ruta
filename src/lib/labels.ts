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

/** Los cinco estados de DepartureStatus (prisma/schema.prisma), en español. */
export const DEPARTURE_STATUS_LABELS: Record<string, string> = {
  PROGRAMADA: "Programada",
  MANIFIESTO_CERRADO: "Embarcando",
  EN_RUTA: "En ruta",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
};

/** Texto en español de un estado de salida; un estado desconocido devuelve su propio nombre. */
export function departureStatusLabel(status: string): string {
  return DEPARTURE_STATUS_LABELS[status] ?? status;
}

const DEPARTURE_STATUS_TONES: Record<string, StatusTone> = {
  PROGRAMADA: "marca",
  MANIFIESTO_CERRADO: "alerta",
  EN_RUTA: "exito",
  FINALIZADA: "neutro",
  CANCELADA: "peligro",
};

/** Tono de pastilla de un estado de salida; un estado desconocido cae en "neutro". */
export function departureStatusTone(status: string): StatusTone {
  return DEPARTURE_STATUS_TONES[status] ?? "neutro";
}

/**
 * Estado operativo de una unidad (chofer o vehículo), derivado de sus salidas
 * en `agencyFleetStatus`. No es un campo de la base de datos.
 */
export type UnitState = "EN_RUTA" | "EMBARCANDO" | "ASIGNADO" | "DISPONIBLE" | "FUERA_DE_SERVICIO";

export const UNIT_STATE_LABELS: Record<UnitState, string> = {
  EN_RUTA: "En ruta",
  EMBARCANDO: "Embarcando",
  ASIGNADO: "Asignado",
  DISPONIBLE: "Disponible",
  FUERA_DE_SERVICIO: "Fuera de servicio",
};

const UNIT_STATE_TONES: Record<UnitState, StatusTone> = {
  EN_RUTA: "exito",
  EMBARCANDO: "alerta",
  ASIGNADO: "marca",
  DISPONIBLE: "neutro",
  FUERA_DE_SERVICIO: "peligro",
};

/** Tono de pastilla del estado operativo de una unidad. */
export function unitStateTone(state: UnitState): StatusTone {
  return UNIT_STATE_TONES[state];
}

/** Los dos canales de venta de SalesChannel (prisma/schema.prisma), en español. */
export const SALES_CHANNEL_LABELS: Record<string, string> = {
  APP: "App",
  TAQUILLA: "Taquilla",
};

/** Texto en español de un canal de venta; un canal desconocido devuelve su propio nombre. */
export function salesChannelLabel(channel: string): string {
  return SALES_CHANNEL_LABELS[channel] ?? channel;
}

/**
 * Los nueve estados de reserva en el lenguaje del pasajero (spec 7.1): dicen
 * qué le pasa a su viaje, no el nombre interno del estado. Solo los usa la
 * app del pasajero; el panel conserva `RESERVATION_STATUS_LABELS`.
 */
export const PASSENGER_STATUS_LABELS: Record<string, string> = {
  PENDIENTE_PAGO: "Falta pagar",
  EN_VALIDACION: "Revisando tu pago",
  ABONADA: "Pagado en parte",
  PAGADA: "Pagado",
  PAGO_EN_SITIO: "Pagas en taquilla",
  LIBERADA: "Puesto liberado",
  CANCELADA: "Cancelada",
  ABORDADA: "Viaje realizado",
  NO_SHOW: "No te presentaste",
};

/** Texto del estado de una reserva para el pasajero; un estado desconocido devuelve su propio nombre. */
export function passengerStatusLabel(status: string): string {
  return PASSENGER_STATUS_LABELS[status] ?? status;
}
