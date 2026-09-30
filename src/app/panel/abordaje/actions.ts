"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { confirmBoarding, findForBoarding } from "@/modules/trips";
import { reservationStatusLabel, reservationStatusTone, type StatusTone } from "@/lib/labels";
import { formatUsdString, toDecimal } from "@/lib/decimal";
import { formatCaracasTime24 } from "@/lib/time";
import { userFacingMessage } from "../feedback";
import { boardingErrorMessage } from "./messages";

/** Ticket encontrado, ya listo para mostrar: estado traducido y saldo con moneda. */
export interface BoardingTicket {
  reservationId: string;
  code: string;
  holderName: string;
  statusLabel: string;
  statusTone: StatusTone;
  /** Lo que falta por cobrar ("$ 12,00"), o `null` si está pagado. */
  balanceLabel: string | null;
  passengers: Array<{
    id: string;
    fullName: string;
    idNumber: string;
    /** Hora a la que ya abordó ("14:05"), o `null` si todavía no. */
    boardedAtLabel: string | null;
  }>;
}

/** Busca un ticket por su código o por el contenido de su QR, dentro de una salida. */
export async function findForBoardingAction(
  departureId: string,
  codeOrQr: string,
): Promise<{ ticket?: BoardingTicket; error?: string }> {
  const user = await requirePanelUser("boarding.manage");
  const agencyId = requireAgencyScope(user);

  const parsed = z.string().trim().min(1).safeParse(codeOrQr);
  if (!parsed.success) {
    return { error: "Escribe el código del ticket o escanea su QR." };
  }
  const parsedDepartureId = z.string().uuid().safeParse(departureId);
  if (!parsedDepartureId.success) {
    return { error: "No encontramos esta salida. Vuelve a la lista de salidas y ábrela de nuevo." };
  }

  try {
    const resultado = await findForBoarding(parsedDepartureId.data, parsed.data, agencyId);
    if ("error" in resultado) return { error: boardingErrorMessage(resultado.error) };

    const r = resultado.reservation;
    const saldo = toDecimal(r.balanceUsd);
    return {
      ticket: {
        reservationId: r.reservationId,
        code: r.code,
        holderName: r.holderName,
        statusLabel: reservationStatusLabel(r.status),
        statusTone: reservationStatusTone(r.status),
        balanceLabel: saldo.gt(0) ? formatUsdString(r.balanceUsd) : null,
        passengers: r.passengers.map((p) => ({
          id: p.id,
          fullName: p.fullName,
          idNumber: p.idNumber,
          boardedAtLabel: p.boardedAt ? formatCaracasTime24(p.boardedAt) : null,
        })),
      },
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("No se pudo buscar el ticket para abordaje", error);
    return { error: "No pudimos buscar el ticket. Revisa la conexión e inténtalo de nuevo." };
  }
}

/** Marca como abordados a los pasajeros elegidos de una reserva. */
export async function confirmBoardingAction(
  reservationId: string,
  passengerIds: string[],
): Promise<{ error?: string; boarded?: number }> {
  const user = await requirePanelUser("boarding.manage");
  const agencyId = requireAgencyScope(user);

  const schema = z.object({
    reservationId: z.string().uuid("Busca el ticket de nuevo e inténtalo otra vez."),
    passengerIds: z
      .array(z.string().uuid("Busca el ticket de nuevo e inténtalo otra vez."))
      .min(1, "Marca al menos un pasajero para registrar el abordaje."),
  });
  const parsed = schema.safeParse({ reservationId, passengerIds });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Busca el ticket de nuevo e inténtalo otra vez." };
  }

  try {
    await confirmBoarding({ ...parsed.data, panelUserId: user.id, agencyId });
  } catch (error) {
    unstable_rethrow(error);
    const mensaje = userFacingMessage(error);
    if (mensaje !== null) return { error: boardingErrorMessage(mensaje) };
    // Un error inesperado no se muestra crudo: se registra y se pide reintentar.
    console.error("No se pudo registrar el abordaje", error);
    return { error: "No pudimos registrar el abordaje. Busca el ticket de nuevo e inténtalo otra vez." };
  }

  // Todo el panel: la hoja de salida, la lista, el tablero y los contadores de
  // esta misma pantalla de abordaje, que se vuelve a pintar con los nuevos totales.
  revalidatePath("/panel", "layout");
  return { boarded: parsed.data.passengerIds.length };
}
