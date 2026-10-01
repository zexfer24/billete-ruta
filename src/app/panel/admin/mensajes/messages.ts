import type { MessageStatus } from "@prisma/client";
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
