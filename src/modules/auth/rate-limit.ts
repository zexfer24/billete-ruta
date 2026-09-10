const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 5;

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Límite de intentos de acceso, en memoria del proceso. Con una sola instancia
 * de la aplicación es suficiente; si algún día se despliega más de una, esto
 * debe moverse a la base de datos.
 */
const buckets = new Map<string, Bucket>();

/** Devuelve true si el intento se permite, false si se superó el límite. */
export function checkLoginRate(key: string, now: number = Date.now()): boolean {
  const actual = buckets.get(key);
  if (!actual || actual.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (actual.count >= MAX_ATTEMPTS) return false;
  actual.count += 1;
  return true;
}

/** Un acceso correcto borra el conteo acumulado. */
export function clearLoginRate(key: string): void {
  buckets.delete(key);
}

export function resetAllLoginRates(): void {
  buckets.clear();
}
