import type { MessageStatus } from "@prisma/client";
import { isValidIdNumber, isValidPhone, normalizePhone } from "@/lib/identity";
import { MESSAGE_STATUS_LABELS } from "@/lib/labels";

/**
 * Reglas puras de la bandeja de mensajes del administrador: estados que se
 * filtran, nombres legibles de las plantillas y lectura segura de la URL.
 * Probadas en tests/unit/panel/admin-format.test.ts.
 */

export const MESSAGES_PATH = "/panel/admin/mensajes";

/** Estados de MessageStatus en el orden en que avanza un mensaje; el fallido va al final. */
export const MESSAGE_STATUSES: readonly MessageStatus[] = ["ENCOLADO", "ENVIADO", "ENTREGADO", "LEIDO", "FALLIDO"];

/**
 * Textos de las pestañas, en su orden: "Todos" y luego cada estado con las
 * etiquetas de `labels.ts`. Los usan las pestañas reales y su silueta.
 */
export const MESSAGE_TAB_LABELS: readonly string[] = [
  "Todos",
  ...MESSAGE_STATUSES.map((status) => MESSAGE_STATUS_LABELS[status] ?? status),
];

/** Estado pedido en `?status=`; cualquier otro valor (o ninguno) muestra todos. */
export function messageStatusFromParam(value: unknown): MessageStatus | undefined {
  return typeof value === "string" && (MESSAGE_STATUSES as readonly string[]).includes(value)
    ? (value as MessageStatus)
    : undefined;
}

/** Nombre de cada plantilla en palabras, en lugar de su clave interna. */
const TEMPLATE_NAMES = new Map<string, string>([
  ["solicitud_recibida", "Solicitud recibida"],
  ["reserva_condicional", "Reserva para pagar en la taquilla"],
  ["abono_registrado", "Abono registrado"],
  ["ticket_emitido", "Ticket emitido"],
  ["pago_rechazado", "Pago rechazado"],
  ["recordatorio_24h", "Recordatorio del viaje, un día antes"],
  ["reconfirmacion_pago_sitio", "Aviso para pagar en la taquilla"],
  ["confirmacion_2h", "Recordatorio del viaje, dos horas antes"],
  ["reserva_liberada", "Puesto liberado"],
  ["cupo_disponible_lista_espera", "Puesto disponible para la lista de espera"],
]);

/** Nombre legible de una plantilla; una clave desconocida se muestra tal cual. */
export function templateName(templateKey: string): string {
  return TEMPLATE_NAMES.get(templateKey) ?? templateKey;
}

/** Convierte el payload JSON guardado en un mapa de textos para `renderStoredPreview`. */
export function payloadToParams(payload: unknown): Record<string, string> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return {};
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (value === null || value === undefined) continue;
    params[key] = typeof value === "string" ? value : String(value);
  }
  return params;
}

/**
 * Qué busca el administrador en la bandeja (`?q=`), ya interpretado. Es
 * `null` si lo escrito no es un código de reserva, un teléfono ni una cédula,
 * para decirle qué se acepta. Si no lo es, trae una o más de estas pistas, y
 * se muestran los mensajes que coinciden con cualquiera de ellas:
 * - `code`: un código de reserva (`TR-0914-1PAX-SA7D`), en mayúsculas;
 * - `phones`: teléfonos en E.164, como se guardan (`0412 123 4567` → `+584121234567`);
 * - `idNumbers`: las formas en que puede estar guardada una cédula escrita
 *   sin letra (`12345678` → `V12345678`, `E12345678`…).
 */
export interface MessageSearch {
  code?: string;
  phones: string[];
  idNumbers: string[];
}

/** Letras con que puede empezar un documento guardado (las de `identity.ts`). */
const ID_PREFIXES = ["V", "E", "P", "J", "CC", "TI", "CE"] as const;

/**
 * Interpreta la búsqueda de la bandeja. Un número con "+" o que empieza por
 * "0" es un teléfono; uno de menos de 10 dígitos, una cédula. Con 10 dígitos
 * o más puede ser las dos cosas (un celular de Venezuela o de Colombia sin el
 * 0, o una cédula colombiana), así que se buscan todas.
 */
export function messageSearchFromQuery(query: string): MessageSearch | null {
  const upper = query.trim().toUpperCase();
  if (upper.startsWith("TR-")) {
    const code = upper.replace(/\s+/g, "");
    return /^TR(?:-[0-9A-Z]+)+$/.test(code) ? { code, phones: [], idNumbers: [] } : null;
  }
  const compact = upper.replace(/[\s.\-_()]/g, "");
  if (/^\+\d+$/.test(compact) || /^0\d+$/.test(compact)) {
    const phone = normalizePhone(compact);
    return isValidPhone(phone) ? { phones: [phone], idNumbers: [] } : null;
  }
  if (/^\d+$/.test(compact)) {
    const idNumbers = isValidIdNumber(compact)
      ? [compact, ...ID_PREFIXES.map((prefix) => `${prefix}${compact}`)]
      : [];
    const phones =
      compact.length >= 10 ? [normalizePhone(compact, "VE"), normalizePhone(compact, "CO")].filter(isValidPhone) : [];
    return idNumbers.length > 0 || phones.length > 0 ? { phones, idNumbers } : null;
  }
  return isValidIdNumber(compact) ? { phones: [], idNumbers: [compact] } : null;
}
