import { caracasDayKey } from "../_shared/day-label";

const DIA_MS = 24 * 3_600_000;

/**
 * Enlaces de la pantalla de salidas. Módulo puro: arma la URL con las
 * pestañas (`?ver=historial`), los días visibles de "Próximas"
 * (`?dias=todos`) y el panel de crear (`?crear=1`), para que abrir y cerrar
 * el panel no cambie lo que se estaba viendo.
 */
export function proximasHref({
  historial = false,
  todosLosDias = false,
  crear = false,
}: {
  historial?: boolean;
  todosLosDias?: boolean;
  crear?: boolean;
}): string {
  const query = new URLSearchParams();
  if (historial) query.set("ver", "historial");
  else if (todosLosDias) query.set("dias", "todos");
  if (crear) query.set("crear", "1");
  const texto = query.toString();
  return texto ? `/panel/salidas?${texto}` : "/panel/salidas";
}

/**
 * Si una salida cae hoy o mañana en Caracas: lo que "Próximas" muestra sin
 * `?dias=todos`. La usan la lista y la acción de crear salida, para que la
 * redirección tras crear lleve a una vista donde la salida nueva se ve.
 * Caracas no cambia de hora, así que "ahora + 24 h" siempre cae en mañana.
 */
export function inTodayOrTomorrow(date: Date, now: Date): boolean {
  return caracasDayKey(date) <= caracasDayKey(new Date(now.getTime() + DIA_MS));
}
