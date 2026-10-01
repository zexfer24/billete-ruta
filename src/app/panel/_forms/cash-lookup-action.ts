"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parsePanelOrigin } from "@/lib/panel-nav";
import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { pasajerosUrlFromHidden } from "@/app/panel/pasajeros/urls";
import { panelFeedbackUrl } from "@/app/panel/feedback";

/** Campos de contexto de "Pasajeros y pagos" que se conservan al volver. */
const CONTEXTO = ["vista", "pagina", "salida", "buscar"] as const;

/**
 * Primer paso del cobro por código: busca la reserva de esta agencia y abre
 * su detalle en "Pasajeros y pagos", que muestra el titular, la salida y
 * "Falta por cobrar" con el monto precargado antes de registrar nada. Si la
 * reserva ya está pagada, ese detalle no ofrece cobrar. Solo se buscan
 * reservas de la agencia de la sesión: de otra agencia se responde igual que
 * si no existiera.
 */
export async function findCashReservationAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("payments.cash");
  const agencyId = requireAgencyScope(user);
  const origen = parsePanelOrigin(formData.get("origen"));

  const contexto: Record<string, string> = {};
  if (origen !== "tablero") {
    for (const clave of CONTEXTO) {
      const valor = formData.get(clave);
      if (typeof valor === "string" && valor.length > 0) contexto[clave] = valor;
    }
  }

  function errorUrl(mensaje: string): string {
    return origen === "tablero"
      ? panelFeedbackUrl("/panel", { registrar: "cobro", error: mensaje })
      : pasajerosUrlFromHidden(contexto, { registrar: "cobro", error: mensaje });
  }

  const code = z.string().trim().min(4).safeParse(formData.get("code"));
  if (!code.success) {
    redirect(errorUrl("Escribe el código de la reserva."));
  }

  const reserva = await prisma.reservation.findUnique({
    where: { code: code.data.toUpperCase() },
    select: { id: true, departure: { select: { route: { select: { agencyId: true } } } } },
  });
  if (!reserva || reserva.departure.route.agencyId !== agencyId) {
    redirect(
      errorUrl("No encontramos una reserva con ese código en tu agencia. Revisa que esté bien escrito."),
    );
  }

  redirect(pasajerosUrlFromHidden(contexto, { reserva: reserva.id }));
}
