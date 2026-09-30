/**
 * Catálogo de plantillas de mensaje. En el MVP se entregan al proveedor falso y
 * quedan visibles en la bandeja del panel; los textos son los que se registrarán
 * en Meta cuando se active el proveedor real. Ver docs/whatsapp-templates.md.
 */
export const TEMPLATE_KEYS = [
  "solicitud_recibida",
  "reserva_condicional",
  "abono_registrado",
  "ticket_emitido",
  "pago_rechazado",
  "recordatorio_24h",
  "reconfirmacion_pago_sitio",
  "confirmacion_2h",
  "reserva_liberada",
  "cupo_disponible_lista_espera",
] as const;

export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

/**
 * Plantillas que deben enviarse una sola vez por reserva. Un índice único parcial
 * en la base de datos hace cumplir esta regla aunque un barrido corra dos veces.
 */
export const ONCE_PER_RESERVATION_TEMPLATES: readonly TemplateKey[] = [
  "recordatorio_24h",
  "reconfirmacion_pago_sitio",
  "confirmacion_2h",
  "ticket_emitido",
];

interface TemplateDefinition {
  params: readonly string[];
  buttons: readonly string[];
  preview: string;
}

const TEMPLATES: Record<TemplateKey, TemplateDefinition> = {
  solicitud_recibida: {
    params: ["nombre", "pasajeros", "serial"],
    buttons: [],
    preview:
      "¡Hola {{nombre}}! Recibimos tu reserva {{serial}}. Pasajeros: {{pasajeros}}. Cuando revisemos tu pago, te enviaremos el ticket.",
  },
  reserva_condicional: {
    params: ["nombre", "serial", "monto", "salida"],
    buttons: [],
    preview:
      "¡Hola {{nombre}}! Tu reserva {{serial}} quedó registrada para pagar en la taquilla. Total: {{monto}}. Salida: {{salida}}. Paga antes de que falten 12 horas para la salida o tu puesto quedará libre.",
  },
  abono_registrado: {
    params: ["nombre", "serial", "abonado", "saldo"],
    buttons: [],
    preview:
      "Hola {{nombre}}, recibimos tu pago de {{abonado}} para la reserva {{serial}}. Te falta pagar {{saldo}}. Puedes completar el pago desde tu cuenta.",
  },
  ticket_emitido: {
    params: ["nombre", "serial", "salida", "punto"],
    buttons: [],
    preview:
      "¡Listo, {{nombre}}! Recibimos tu pago completo. Código del ticket: {{serial}}. Salida: {{salida}}. Punto de encuentro: {{punto}}. Te adjuntamos el ticket con su código QR.",
  },
  pago_rechazado: {
    params: ["nombre", "serial", "motivo"],
    buttons: [],
    preview:
      "Hola {{nombre}}, no pudimos aceptar el comprobante de la reserva {{serial}}. Motivo: {{motivo}}. Puedes enviar otro desde tu cuenta.",
  },
  recordatorio_24h: {
    params: ["nombre", "serial", "salida", "punto", "recomendaciones"],
    buttons: [],
    preview:
      "Hola {{nombre}}, tu viaje {{serial}} sale el {{salida}} desde {{punto}}. {{recomendaciones}}",
  },
  reconfirmacion_pago_sitio: {
    params: ["nombre", "serial", "salida", "monto"],
    buttons: ["RECONFIRMAR"],
    preview:
      "Hola {{nombre}}, tu viaje {{serial}} sale el {{salida}}. Total a pagar en la taquilla: {{monto}}. Paga antes de que falten 12 horas para la salida o tu puesto quedará libre.",
  },
  confirmacion_2h: {
    params: ["nombre", "serial"],
    buttons: ["ASISTE", "INCONVENIENTE"],
    preview: "Hola {{nombre}}, tu viaje {{serial}} es en breve. ¿Confirmas tu asistencia?",
  },
  reserva_liberada: {
    params: ["nombre", "serial"],
    buttons: [],
    preview:
      "Hola {{nombre}}, tu puesto de la reserva {{serial}} quedó libre porque no recibimos el pago a tiempo. Puedes reservar de nuevo si aún hay puestos.",
  },
  cupo_disponible_lista_espera: {
    params: ["nombre", "salida", "enlace", "vigencia"],
    buttons: [],
    preview:
      "Hola {{nombre}}, se liberó un puesto en la salida del {{salida}}. Te lo guardamos por {{vigencia}}. Completa tu reserva aquí: {{enlace}}",
  },
};

export function templateParams(key: TemplateKey): readonly string[] {
  return TEMPLATES[key].params;
}

export function templateButtons(key: TemplateKey): readonly string[] {
  return TEMPLATES[key].buttons;
}

export function isTemplateKey(value: string): value is TemplateKey {
  return (TEMPLATE_KEYS as readonly string[]).includes(value);
}

/** Texto ya sustituido, tal como lo verá el pasajero. */
export function renderPreview(key: TemplateKey, params: Record<string, string>): string {
  const definicion = TEMPLATES[key];
  const faltantes = definicion.params.filter((p) => params[p] === undefined);
  if (faltantes.length > 0) {
    throw new Error(`Faltan parámetros para la plantilla ${key}: ${faltantes.join(", ")}`);
  }
  return definicion.preview.replace(/\{\{(\w+)\}\}/g, (_m, nombre: string) => params[nombre] ?? "");
}

/** Texto de un mensaje ya guardado: nunca lanza; los parámetros ausentes se sustituyen por "…". */
export function renderStoredPreview(key: TemplateKey, params: Record<string, string>): string {
  const definicion = TEMPLATES[key];
  return definicion.preview.replace(/\{\{(\w+)\}\}/g, (_m, nombre: string) => {
    const valor = params[nombre];
    return valor !== undefined && valor !== "" ? valor : "…";
  });
}
