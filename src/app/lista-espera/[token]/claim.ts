import { cache } from "react";
import { z } from "zod";
import { getWaitlistClaim } from "@/modules/booking";

/** Un token con forma imposible no llega a la base de datos: se trata como enlace no activo. */
const tokenSchema = z.string().min(1).max(200);

/**
 * Aviso vigente de un enlace de lista de espera, o `null` si el enlace no
 * existe, venció o ya se usó. Lo piden el layout (para responder 404 antes de
 * que el skeleton empiece a enviarse) y la página (para pintar los datos).
 * `cache` hace que en una misma solicitud los dos compartan una sola consulta
 * y la misma hora de referencia `now`.
 */
export const getActiveClaim = cache(async (token: string) => {
  const tokenValido = tokenSchema.safeParse(token);
  if (!tokenValido.success) return null;

  const now = new Date();
  const aviso = await getWaitlistClaim(tokenValido.data, now);
  if (!aviso || !aviso.claimExpiresAt) return null;

  return { aviso, claimExpiresAt: aviso.claimExpiresAt, now };
});
