"use server";

import { z } from "zod";
import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { confirmBoarding, findForBoarding } from "@/modules/trips";
import type { BoardingView } from "@/modules/trips";

/** Busca una reserva por serial o por el contenido de un QR, dentro de una salida. */
export async function findForBoardingAction(
  departureId: string,
  codeOrQr: string,
): Promise<{ reservation?: BoardingView; error?: string }> {
  const user = await requirePanelUser("boarding.manage");
  const agencyId = requireAgencyScope(user);

  const parsed = z.string().trim().min(1).safeParse(codeOrQr);
  if (!parsed.success) {
    return { error: "Escribe o escanea un serial." };
  }
  const parsedDepartureId = z.string().uuid().safeParse(departureId);
  if (!parsedDepartureId.success) {
    return { error: "La salida indicada no es válida." };
  }

  const resultado = await findForBoarding(parsedDepartureId.data, parsed.data, agencyId);
  if ("error" in resultado) return { error: resultado.error };
  return { reservation: resultado.reservation };
}

/** Marca abordado al grupo seleccionado de una reserva. */
export async function confirmBoardingAction(
  reservationId: string,
  passengerIds: string[],
): Promise<{ error?: string }> {
  const user = await requirePanelUser("boarding.manage");
  const agencyId = requireAgencyScope(user);

  try {
    const schema = z.object({
      reservationId: z.string().uuid(),
      passengerIds: z.array(z.string().uuid()).min(1),
    });
    const data = schema.parse({ reservationId, passengerIds });
    await confirmBoarding({ ...data, panelUserId: user.id, agencyId });
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo registrar el abordaje.",
    };
  }
}
