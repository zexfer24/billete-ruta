import { z } from "zod";
import { reservationViewFromSlug } from "@/modules/reports";
import type { ReservationView } from "@/modules/reports";

/**
 * Lectura de los filtros de "Pasajeros y pagos" desde la URL. Módulo puro,
 * compartido por la página y la descarga en CSV. Ningún valor manipulado
 * llega a la base de datos: lo que no es válido cae a "sin filtro" (spec 1.9).
 * Antes, un `?salida=` que no era un UUID llegaba tal cual a Prisma y la
 * pantalla respondía con un error 500.
 */

/** Largo máximo del texto de búsqueda: suficiente para un nombre completo o un código. */
export const MAX_SEARCH_LENGTH = 80;

/** Página más alta que se acepta; más allá, la lista cae a la última página válida. */
export const MAX_PAGE = 10_000;

const uuidSchema = z.string().uuid();
const pageSchema = z.coerce.number().int().min(1).max(MAX_PAGE).catch(1);

/** Valor de un parámetro de búsqueda tal como lo entrega Next o `URLSearchParams`. */
type RawValue = string | string[] | null | undefined;

function single(value: RawValue): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** El identificador si es un UUID válido; cualquier otra cosa es "sin valor". */
export function uuidParam(value: RawValue): string | undefined {
  const parsed = uuidSchema.safeParse(single(value));
  return parsed.success ? parsed.data : undefined;
}

export interface PasajerosFilters {
  /** `undefined` si la URL no trae una vista válida: la página elige la de por defecto. */
  vista?: ReservationView;
  salida?: string;
  buscar?: string;
  pagina: number;
}

/** Filtros de la lista validados: vista conocida, salida UUID, búsqueda recortada y página entera. */
export function parsePasajerosFilters(raw: {
  vista?: RawValue;
  salida?: RawValue;
  buscar?: RawValue;
  pagina?: RawValue;
}): PasajerosFilters {
  const buscar = single(raw.buscar)?.trim().slice(0, MAX_SEARCH_LENGTH);
  return {
    vista: reservationViewFromSlug(single(raw.vista)),
    salida: uuidParam(raw.salida),
    buscar: buscar ? buscar : undefined,
    pagina: pageSchema.parse(single(raw.pagina) ?? 1),
  };
}
