"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isValidIdNumber, normalizeIdNumber } from "@/lib/identity";
import { parsePanelOrigin } from "@/lib/panel-nav";
import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { reservationViewWhere } from "@/modules/reports";
import { pasajerosUrl, pasajerosUrlFromHidden } from "@/app/panel/pasajeros/urls";
import { panelFeedbackUrl } from "@/app/panel/feedback";
import { CASH_LOOKUP_EMPTY, CASH_LOOKUP_NOT_FOUND } from "./cash-lookup-text";

/** Campos de contexto de "Pasajeros y pagos" que se conservan al volver. */
const CONTEXTO = ["vista", "pagina", "salida", "buscar"] as const;

/**
 * Cédulas que se buscan tal cual: la escrita y, si solo tiene números, con
 * los prefijos V y E, que es como se guardan las cédulas venezolanas.
 */
function cedulasCandidatas(texto: string): string[] {
  const cedula = normalizeIdNumber(texto);
  return /^\d+$/.test(cedula) ? [cedula, `V${cedula}`, `E${cedula}`] : [cedula];
}

/**
 * Primer paso del cobro en efectivo: busca la reserva de esta agencia y abre
 * su detalle en "Pasajeros y pagos", que muestra el titular, la salida y lo
 * que falta por cobrar antes de registrar nada. Si la reserva ya está pagada,
 * ese detalle no ofrece cobrar.
 *
 * Acepta el código de la reserva o la cédula del titular, porque quien paga
 * en la taquilla siempre trae la cédula pero no siempre el código. Con una
 * cédula, si tiene una sola reserva por cobrar en la agencia se abre esa; si
 * tiene varias (o ninguna con esa cédula exacta) se abre la lista "Por
 * cobrar" filtrada por esa cédula, que busca dentro de la misma agencia.
 *
 * Solo se buscan reservas de la agencia de la sesión: de otra agencia se
 * responde igual que si no existiera.
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

  const texto = z.string().trim().min(4).safeParse(formData.get("code"));
  if (!texto.success) {
    redirect(errorUrl(CASH_LOOKUP_EMPTY));
  }

  const reserva = await prisma.reservation.findUnique({
    where: { code: texto.data.toUpperCase() },
    select: { id: true, departure: { select: { route: { select: { agencyId: true } } } } },
  });
  if (reserva && reserva.departure.route.agencyId === agencyId) {
    redirect(pasajerosUrlFromHidden(contexto, { reserva: reserva.id }));
  }

  if (isValidIdNumber(texto.data)) {
    const cedula = normalizeIdNumber(texto.data);
    const porCobrar = await prisma.reservation.findMany({
      where: {
        departure: { route: { agencyId } },
        account: { idNumber: { in: cedulasCandidatas(cedula) } },
        AND: [reservationViewWhere("por-cobrar")],
      },
      select: { id: true },
      take: 2,
    });
    const unica = porCobrar.length === 1 ? porCobrar[0] : undefined;
    redirect(
      unica
        ? pasajerosUrlFromHidden(contexto, { reserva: unica.id })
        : pasajerosUrl({ vista: "por-cobrar", buscar: cedula }),
    );
  }

  redirect(errorUrl(CASH_LOOKUP_NOT_FOUND));
}
