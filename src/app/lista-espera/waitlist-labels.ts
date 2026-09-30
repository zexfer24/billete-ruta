import { formatCaracas, formatCaracasDate, formatCaracasTime24, formatDuration, minutesUntil } from "@/lib/time";

/**
 * Textos de la página de lista de espera, en singular o plural según el
 * número y con la hora de Caracas en formato de 24 horas. Funciones puras.
 */

/** Título de la buena noticia: "¡Se liberó un puesto para ti!" o "¡Se liberaron 2 puestos para ti!". */
export function claimTitle(seats: number): string {
  return seats === 1 ? "¡Se liberó un puesto para ti!" : `¡Se liberaron ${seats} puestos para ti!`;
}

/** "Guardamos 1 puesto para ti" o "Guardamos 3 puestos para ti". */
export function heldSeatsLabel(seats: number): string {
  return seats === 1 ? "Guardamos 1 puesto para ti" : `Guardamos ${seats} puestos para ti`;
}

/** Texto del botón principal: "Reservar mi puesto" o "Reservar mis 2 puestos". */
export function claimActionLabel(seats: number): string {
  return seats === 1 ? "Reservar mi puesto" : `Reservar mis ${seats} puestos`;
}

/** Hasta cuándo vale el aviso: "hoy a las 14:30" o "el 02/10 a las 08:00". */
export function claimDeadlineLabel(expiresAt: Date, now: Date): string {
  const hora = formatCaracasTime24(expiresAt);
  if (formatCaracasDate(expiresAt) === formatCaracasDate(now)) return `hoy a las ${hora}`;
  return `el ${formatCaracas(expiresAt, "dd/MM")} a las ${hora}`;
}

/** Tiempo que queda: "Te quedan 25 min", "Te quedan 2 h 10 min" o "Te queda menos de un minuto". */
export function claimRemainingLabel(expiresAt: Date, now: Date): string {
  const minutos = minutesUntil(expiresAt, now);
  if (minutos < 1) return "Te queda menos de un minuto";
  return `Te quedan ${formatDuration(minutos)}`;
}
