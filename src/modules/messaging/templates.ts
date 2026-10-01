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

/**
 * Parámetros comunes (los llena quien encola, en datos crudos):
 * - `ruta`: "Caracas → Mérida" (`messageRoute`). Cada mensaje nombra su viaje,
 *   porque el pasajero puede tener varias reservas a la vez.
 * - `salida` y `limite`: "01/10/2026 06:00" (`formatCaracasDateTime24`), que
 *   `displayParam` pasa a "jueves 1 de octubre a las 06:00". `limite` sale
 *   siempre de `@/modules/scheduler` (`paymentDeadline`, `cashCounterDeadline`),
 *   el mismo plazo que muestra la app.
 */
const TEMPLATES: Record<TemplateKey, TemplateDefinition> = {
  // Se envía al crear la reserva, cuando todavía no hay ningún pago. El límite
  // es el menor entre las 2 horas de la reserva y la salida del bus.
  solicitud_recibida: {
    params: ["nombre", "pasajeros", "serial", "ruta", "salida", "limite"],
    buttons: [],
    preview:
      "¡Hola {{nombre}}! Recibimos tu reserva {{serial}} para {{pasajeros}} en el viaje {{ruta}}, que sale el {{salida}}. Para no perderla, paga antes del {{limite}} y envía la foto del comprobante desde tu cuenta. Cuando revisemos tu pago, te enviaremos el ticket.",
  },
  reserva_condicional: {
    params: ["nombre", "serial", "monto", "ruta", "salida", "limite"],
    buttons: [],
    preview:
      "¡Hola {{nombre}}! Guardamos tu puesto con la reserva {{serial}}. Tu viaje {{ruta}} sale el {{salida}}. Paga {{monto}} en la taquilla antes del {{limite}} o tu puesto quedará libre.",
  },
  abono_registrado: {
    params: ["nombre", "serial", "ruta", "abonado", "saldo"],
    buttons: [],
    preview:
      "Hola {{nombre}}, recibimos tu pago de {{abonado}} para la reserva {{serial}} del viaje {{ruta}}. Te falta pagar {{saldo}}. Puedes completar el pago desde tu cuenta.",
  },
  ticket_emitido: {
    params: ["nombre", "serial", "ruta", "salida", "punto"],
    buttons: [],
    preview:
      "¡Listo, {{nombre}}! Recibimos tu pago completo. Tu viaje {{ruta}} sale el {{salida}} desde {{punto}}. Tu ticket es el {{serial}} y te lo adjuntamos con su código QR.",
  },
  pago_rechazado: {
    params: ["nombre", "serial", "ruta", "motivo"],
    buttons: [],
    preview:
      "Hola {{nombre}}, no pudimos aceptar el comprobante de la reserva {{serial}} del viaje {{ruta}}. Motivo: {{motivo}}. Puedes enviar otro desde tu cuenta.",
  },
  // `recomendaciones` lo arma `reminderRecommendations`: a una reserva pagada
  // en parte le antepone lo que todavía debe, porque sin ese pago no recibe el
  // ticket ni puede abordar. Es la misma plantilla (mismos parámetros fijos,
  // como pide Meta) y el índice único sigue impidiendo un segundo recordatorio.
  recordatorio_24h: {
    params: ["nombre", "serial", "ruta", "salida", "punto", "recomendaciones"],
    buttons: [],
    preview:
      "Hola {{nombre}}, tu viaje {{ruta}} con la reserva {{serial}} sale el {{salida}} desde {{punto}}. {{recomendaciones}}",
  },
  // El botón RECONFIRMAR es el de la spec, pero en el MVP no hace nada: ningún
  // flujo marca `reconfirmedAt` y los botones no se muestran en la bandeja
  // falsa, así que el único modo real de conservar el puesto es pagar, y eso
  // dice el texto. Cuando se conecte Meta y un webhook marque `reconfirmedAt`,
  // el texto debe volver a pedir «confirma que viajas y paga al llegar».
  reconfirmacion_pago_sitio: {
    params: ["nombre", "serial", "ruta", "salida", "monto", "limite"],
    buttons: ["RECONFIRMAR"],
    preview:
      "Hola {{nombre}}, tu viaje {{ruta}} con la reserva {{serial}} sale el {{salida}}. Paga {{monto}} en la taquilla antes del {{limite}} o tu puesto quedará libre.",
  },
  // Los botones ASISTE e INCONVENIENTE son los de la spec, pero en el MVP no se
  // muestran en la bandeja falsa ni hay flujo que procese la respuesta, así que
  // el texto informa (hora y punto de encuentro) sin preguntar nada. Cuando se
  // conecte Meta y un webhook reciba la respuesta, el texto puede volver a
  // preguntar.
  confirmacion_2h: {
    params: ["nombre", "serial", "ruta", "salida", "punto"],
    buttons: ["ASISTE", "INCONVENIENTE"],
    preview:
      "Hola {{nombre}}, tu viaje {{ruta}} con la reserva {{serial}} sale el {{salida}} desde {{punto}}. Ve al terminal con tiempo y con tu cédula en mano.",
  },
  reserva_liberada: {
    params: ["nombre", "serial", "ruta"],
    buttons: [],
    preview:
      "Hola {{nombre}}, tu puesto de la reserva {{serial}} en el viaje {{ruta}} quedó libre porque no recibimos el pago a tiempo. Puedes reservar de nuevo si aún hay puestos.",
  },
  cupo_disponible_lista_espera: {
    params: ["nombre", "ruta", "salida", "enlace", "vigencia"],
    buttons: [],
    preview:
      "Hola {{nombre}}, se liberó un puesto en el viaje {{ruta}} del {{salida}}. Te lo guardamos por {{vigencia}}. Completa tu reserva aquí: {{enlace}}",
  },
};

/** El parámetro `ruta` de los mensajes: "Caracas → Mérida". */
export function messageRoute(route: { origin: string; destination: string }): string {
  return `${route.origin} → ${route.destination}`;
}

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

/** Parámetros que guardan un monto ya formateado ("$ 41,00", "Bs. 1.200,00"). */
const PARAMETROS_DE_MONTO = new Set(["monto", "abonado", "saldo"]);

/**
 * Une el símbolo de la moneda con la cifra mediante un espacio de no separación
 * (U+00A0), para que el monto nunca se parta entre dos líneas ("$" al final de
 * una y "41,00" al principio de la siguiente). Corrige también los mensajes ya
 * guardados, que conservan el espacio normal de `formatMoney`.
 */
function montoSinCorte(valor: string): string {
  return valor.replace(/^(\$|Bs\.|COP|USDT) +/, "$1\u00A0");
}

/** Recomendación del recordatorio de 24 horas cuando la ruta no tiene una propia. */
export const DEFAULT_TRAVEL_TIPS = "Llega 30 minutos antes con tu cédula en mano.";

/**
 * Parámetro `recomendaciones` del recordatorio de 24 horas. Si la reserva
 * todavía debe dinero (`saldo`, ya formateado: "$ 19,12"), lo primero que lee
 * el pasajero es cuánto le falta y qué pasa si no paga; después, las
 * recomendaciones de la ruta (o las de siempre).
 */
export function reminderRecommendations(input: {
  travelTips?: string | null;
  saldo?: string | null;
}): string {
  const consejos = input.travelTips?.trim() || DEFAULT_TRAVEL_TIPS;
  const saldo = input.saldo?.trim();
  if (!saldo) return consejos;
  return `Todavía te falta pagar ${montoSinCorte(saldo)}: sin ese pago no recibes tu ticket y no puedes abordar. Paga desde tu cuenta o en la taquilla. ${consejos}`;
}

/** Parámetros que guardan una fecha con hora ("01/10/2026 06:00"). */
const PARAMETROS_DE_FECHA = new Set(["salida", "limite"]);

/**
 * Valor de un parámetro tal como se escribe en el mensaje. Los payloads guardan
 * datos crudos (nombre completo, número de pasajeros, fecha en cifras) y aquí se
 * pasan a lenguaje llano: primer nombre en el saludo, "1 persona", la fecha
 * con su día en palabras y el monto con su símbolo pegado a la cifra. Lo usan
 * la vista previa y la entrega (`providerParams`), para que el proveedor envíe
 * exactamente lo que muestran las bandejas.
 */
export function displayParam(nombre: string, valor: string): string {
  if (nombre === "nombre") return firstNamePart(valor) || valor;
  if (nombre === "pasajeros") return personasEnPalabras(valor);
  if (PARAMETROS_DE_FECHA.has(nombre)) return fechaEnPalabras(valor);
  if (PARAMETROS_DE_MONTO.has(nombre)) return montoSinCorte(valor);
  return valor;
}

/**
 * Parámetros de una plantilla listos para el proveedor: solo los declarados,
 * ya pasados por `displayParam`. Lo que no es un parámetro (el texto guardado
 * en `STORED_TEXT_KEY`) no se envía.
 */
export function providerParams(key: TemplateKey, payload: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const nombre of TEMPLATES[key].params) {
    const valor = payload[nombre];
    if (valor !== undefined && valor !== null) params[nombre] = displayParam(nombre, String(valor));
  }
  return params;
}

/**
 * Texto ya sustituido, tal como se le envía al pasajero. Es el que
 * `enqueueMessage` guarda en `STORED_TEXT_KEY`.
 */
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
 * Clave del payload donde `enqueueMessage` guarda el texto exacto del mensaje,
 * para que la bandeja muestre lo que el pasajero recibió aunque la plantilla
 * cambie después. Empieza con guion bajo para no chocar con ningún parámetro.
 */
export const STORED_TEXT_KEY = "_texto";

/** Carácter invisible que impide cortar la línea (U+2060, WORD JOINER). */
const SIN_CORTE = "\u2060";

/**
 * Los códigos de reserva ("TR-1001-1PAX-LFC2") no se parten por el guion al
 * final de una línea. Solo al mostrar en pantalla: el texto que se envía y se
 * guarda conserva el código tal cual.
 */
function codigosSinCorte(texto: string): string {
  return texto.replace(/\bTR(?:-[A-Z0-9]+)+/g, (codigo) => codigo.replaceAll("-", `-${SIN_CORTE}`));
}

/**
 * Texto de un mensaje ya guardado, para las bandejas del pasajero y del admin.
 * Nunca lanza. Si el mensaje guardó su texto al encolarse, se muestra ese, que
 * es el que se envió. Un mensaje anterior a eso se arma con la redacción
 * vigente de su plantilla y sus parámetros ausentes se sustituyen por "…".
 */
export function renderStoredPreview(key: TemplateKey, params: Record<string, string>): string {
  const guardado = params[STORED_TEXT_KEY];
  if (guardado !== undefined && guardado.trim() !== "") return codigosSinCorte(guardado);
  const definicion = TEMPLATES[key];
  return codigosSinCorte(
    definicion.preview.replace(/\{\{(\w+)\}\}/g, (_m, nombre: string) => {
      const valor = params[nombre];
      return valor !== undefined && valor !== "" ? displayParam(nombre, valor) : "…";
    }),
  );
}
