import { z } from "zod";
import { firstParam } from "../_publico/links";
import { REGISTER_MODES, type RegisterMode } from "./texts";

const registerModeSchema = z.enum(REGISTER_MODES);

/**
 * Modo del registro a partir de `?modo=`: "activar" solo si llega exactamente
 * así; un valor repetido toma el primero, y uno vacío, desconocido o mal
 * formado cae a "crear" (spec 1.9). Va aparte de `texts.ts` para que zod no
 * llegue al formulario de cliente.
 */
export function parseRegisterMode(value: string | string[] | undefined): RegisterMode {
  const parsed = registerModeSchema.safeParse(firstParam(value));
  return parsed.success ? parsed.data : "crear";
}
