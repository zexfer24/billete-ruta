import { firstNamePart } from "@/lib/identity";

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
      "¡Hola {{nombre}}! Recibimos tu reserva {{serial}} para {{pasajeros}}. Cuando revisemos tu pago, te enviaremos el ticket.",
  },
  reserva_condicional: {
    params: ["nombre", "serial", "monto", "salida"],
    buttons: [],
    preview:
      "¡Hola {{nombre}}! Guardamos tu puesto con la reserva {{serial}}. Tu viaje sale el {{salida}}. Paga {{monto}} en la taquilla antes de que falten 12 horas para la salida o tu puesto quedará libre.",
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
      "¡Listo, {{nombre}}! Recibimos tu pago completo. Tu viaje sale el {{salida}} desde {{punto}}. Tu ticket es el {{serial}} y te lo adjuntamos con su código QR.",
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
  // El botón RECONFIRMAR es el de la spec, pero en el MVP no hace nada: ningún
  // flujo marca `reconfirmedAt` y los botones no se muestran en la bandeja
  // falsa, así que el único modo real de conservar el puesto es pagar, y eso
  // dice el texto. Cuando se conecte Meta y un webhook marque `reconfirmedAt`,
  // el texto debe volver a pedir «confirma que viajas y paga al llegar».
  reconfirmacion_pago_sitio: {
    params: ["nombre", "serial", "salida", "monto"],
    buttons: ["RECONFIRMAR"],
    preview:
      "Hola {{nombre}}, tu viaje {{serial}} sale el {{salida}}. Paga {{monto}} en la taquilla antes de que falten 12 horas para la salida o tu puesto quedará libre.",
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
      "Hola {{nombre}}, se liberó un puesto en el viaje del {{salida}}. Te lo guardamos por {{vigencia}}. Completa tu reserva aquí: {{enlace}}",
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

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/**
 * "01/10/2026 06:00" (lo que guardan los payloads, `formatCaracasDateTime24`,
 * ya en hora de Caracas) → "jueves 1 de octubre a las 06:00". Cualquier otro
 * valor se deja igual.
 */
function fechaEnPalabras(valor: string): string {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2})$/.exec(valor.trim());
  if (!partes) return valor;
  const [, dd, mm, yyyy, hora] = partes;
  const dia = Number(dd);
  const mes = Number(mm);
  const fecha = new Date(Date.UTC(Number(yyyy), mes - 1, dia));
  if (fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return valor;
  return `${DIAS[fecha.getUTCDay()]} ${dia} de ${MESES[mes - 1]} a las ${hora}`;
}

/** "1" → "1 persona", "3" → "3 personas"; cualquier otro valor se deja igual. */
function personasEnPalabras(valor: string): string {
  const texto = valor.trim();
  if (!/^\d+$/.test(texto)) return valor;
  const cantidad = Number(texto);
  return `${cantidad} ${cantidad === 1 ? "persona" : "personas"}`;
}

/**
 * Valor de un parámetro tal como se escribe en el mensaje. Los payloads guardan
 * datos crudos (nombre completo, número de pasajeros, fecha en cifras) y aquí se
 * pasan a lenguaje llano: primer nombre en el saludo, "1 persona" y la fecha
 * con su día en palabras. Al hacerlo al mostrar, los mensajes ya guardados se
 * leen igual que los nuevos. El proveedor real debe enviar estos mismos valores.
 */
export function displayParam(nombre: string, valor: string): string {
  if (nombre === "nombre") return firstNamePart(valor) || valor;
  if (nombre === "pasajeros") return personasEnPalabras(valor);
  if (nombre === "salida") return fechaEnPalabras(valor);
  return valor;
}

/** Texto ya sustituido, tal como lo verá el pasajero. */
export function renderPreview(key: TemplateKey, params: Record<string, string>): string {
  const definicion = TEMPLATES[key];
  const faltantes = definicion.params.filter((p) => params[p] === undefined);
  if (faltantes.length > 0) {
    throw new Error(`Faltan parámetros para la plantilla ${key}: ${faltantes.join(", ")}`);
  }
  return definicion.preview.replace(/\{\{(\w+)\}\}/g, (_m, nombre: string) =>
    displayParam(nombre, params[nombre] ?? ""),
  );
}

/**
 * Texto de un mensaje ya guardado: nunca lanza; los parámetros ausentes se
 * sustituyen por "…". Limitación conocida del MVP: `OutboundMessage` no guarda
 * el texto enviado, así que un mensaje viejo se arma con la redacción vigente
 * de su plantilla. Si importa la trazabilidad exacta, hay que versionar las
 * plantillas o guardar el texto al encolar.
 */
export function renderStoredPreview(key: TemplateKey, params: Record<string, string>): string {
  const definicion = TEMPLATES[key];
  return definicion.preview.replace(/\{\{(\w+)\}\}/g, (_m, nombre: string) => {
    const valor = params[nombre];
    return valor !== undefined && valor !== "" ? displayParam(nombre, valor) : "…";
  });
}
