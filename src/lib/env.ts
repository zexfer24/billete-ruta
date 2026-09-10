import { z } from "zod";

/**
 * Configuración de entorno del sistema. Se valida una sola vez al arrancar
 * para que un valor mal puesto falle de inmediato y no en mitad de una venta.
 */
const envSchema = z.object({
  DATABASE_URL: z
    .string({ required_error: "DATABASE_URL es obligatoria" })
    .url("DATABASE_URL debe ser una URL de conexión válida"),
  SESSION_SECRET: z
    .string({ required_error: "SESSION_SECRET es obligatorio" })
    .min(32, "SESSION_SECRET debe tener al menos 32 caracteres"),
  TICKET_SECRET: z
    .string({ required_error: "TICKET_SECRET es obligatorio" })
    .min(32, "TICKET_SECRET debe tener al menos 32 caracteres"),
  WHATSAPP_PROVIDER: z.enum(["meta", "fake"], {
    errorMap: () => ({ message: "WHATSAPP_PROVIDER debe ser 'meta' o 'fake'" }),
  }),
  PUBLIC_BASE_URL: z
    .string({ required_error: "PUBLIC_BASE_URL es obligatoria" })
    .url("PUBLIC_BASE_URL debe ser una URL válida"),
  UPLOADS_DIR: z
    .string({ required_error: "UPLOADS_DIR es obligatoria" })
    .min(1, "UPLOADS_DIR no puede estar vacía"),
  TZ: z.string().min(1).default("America/Caracas"),
});

export type Env = z.infer<typeof envSchema>;

/** Valida un conjunto de variables de entorno y devuelve la configuración tipada. */
export function loadEnv(source: NodeJS.ProcessEnv): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const detalle = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(raíz)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Configuración de entorno inválida — ${detalle}`);
  }
  return parsed.data;
}

let cached: Env | undefined;

/** Configuración del proceso actual, calculada una sola vez. */
export function getEnv(): Env {
  cached ??= loadEnv(process.env);
  return cached;
}
