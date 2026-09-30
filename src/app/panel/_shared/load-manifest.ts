import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { ForbiddenError } from "@/modules/auth";
import { getManifest } from "@/modules/catalog";

/**
 * Manifiesto de una salida de la agencia, o la página 404 si el id de la URL
 * no es válido, no existe o es de otra agencia. Así un enlace manipulado
 * nunca tumba la pantalla ni revela que la salida existe en otra agencia.
 */
export async function loadManifestOrNotFound(departureId: string, agencyId: string) {
  if (!z.string().uuid().safeParse(departureId).success) notFound();
  return getManifest(departureId, agencyId).catch((error: unknown) => {
    if (error instanceof ForbiddenError) notFound();
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      notFound();
    }
    throw error;
  });
}
