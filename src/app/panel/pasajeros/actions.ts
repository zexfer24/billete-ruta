"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Currency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { ValidationError } from "@/modules/booking";
import { approveProof, registerCashPayment, rejectProof } from "@/modules/payments";
import { issueTicket } from "@/modules/tickets";
import { reservationViewFromSlug } from "@/modules/reports";
import type { ReservationView } from "@/modules/reports";
import { parsePanelOrigin } from "@/lib/panel-nav";
import { panelFeedbackUrl, userFacingMessage } from "../feedback";
import { pasajerosUrl } from "./urls";

const CURRENCIES = ["USD", "VES", "COP", "USDT"] as const;

/** Aviso cuando se intenta cobrar una reserva que ya quedó pagada (un archivo "use server" solo exporta funciones). */
const ALREADY_PAID_MESSAGE = "Esta reserva ya está pagada. No se registró ningún cobro.";

const paginaSchema = z.coerce.number().int().min(1).catch(1);

/** Acepta coma o punto decimal y exige un número finito mayor que cero, como en `admin/tasas`. */
const amountSchema = z
  .string()
  .transform((v) => v.trim().replace(",", "."))
  .refine((v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0;
  }, "Ingresa un monto numérico mayor a cero.");

function formString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Campos ocultos de retorno, comunes a las tres acciones: la vista, la
 * página, los filtros de salida y búsqueda, y la reserva de origen cuando la
 * acción se lanzó desde el panel lateral de una reserva.
 */
interface RetornoComun {
  vista?: ReservationView;
  pagina?: number;
  salida?: string;
  buscar?: string;
  reservaId?: string;
}

function leerRetornoComun(formData: FormData): RetornoComun {
  const vista = reservationViewFromSlug(formString(formData, "vista"));
  const pagina = paginaSchema.parse(formData.get("pagina"));
  const salida = formString(formData, "salida");
  const buscar = formString(formData, "buscar");
  const reservaIdParsed = z.string().uuid().safeParse(formData.get("reservaId"));
  const reservaId = reservaIdParsed.success ? reservaIdParsed.data : undefined;
  return { vista, pagina: pagina > 1 ? pagina : undefined, salida, buscar, reservaId };
}

/** Destino común de retorno (contexto de lista más la reserva de origen, si la hay). */
function destinoComprobante(retorno: RetornoComun) {
  return {
    vista: retorno.vista,
    pagina: retorno.pagina,
    salida: retorno.salida,
    buscar: retorno.buscar,
    reserva: retorno.reservaId,
  };
}

export async function approveProofAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("payments.review");
  const agencyId = requireAgencyScope(user);
  const retorno = leerRetornoComun(formData);
  const destino = destinoComprobante(retorno);

  const proofIdParsed = z.string().uuid().safeParse(formData.get("proofId"));
  if (!proofIdParsed.success) {
    redirect(pasajerosUrl({ ...destino, error: "Comprobante inválido." }));
  }
  const proofId = proofIdParsed.data;

  let errorMessage: string | null = null;
  try {
    const resultado = await approveProof({ proofId, panelUserId: user.id, agencyId });
    if (resultado.shouldIssueTicket) {
      await issueTicket(resultado.reservationId);
    }
  } catch (error) {
    const mensaje = userFacingMessage(error);
    if (mensaje === null) throw error;
    errorMessage = mensaje;
  }

  if (errorMessage) {
    redirect(
      pasajerosUrl({
        ...destino,
        comprobante: retorno.reservaId ? undefined : proofId,
        error: errorMessage,
      }),
    );
  }

  revalidatePath("/panel/pasajeros");
  revalidatePath("/panel");

  redirect(pasajerosUrl({ ...destino, ok: "aprobado" }));
}

export async function rejectProofAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("payments.review");
  const agencyId = requireAgencyScope(user);
  const retorno = leerRetornoComun(formData);
  const destino = destinoComprobante(retorno);

  const proofIdParsed = z.string().uuid().safeParse(formData.get("proofId"));
  if (!proofIdParsed.success) {
    redirect(pasajerosUrl({ ...destino, error: "Comprobante inválido." }));
  }
  const proofId = proofIdParsed.data;

  const reasonParsed = z
    .string()
    .trim()
    .min(4, "Indica el motivo del rechazo (mínimo 4 caracteres).")
    .safeParse(formData.get("reason"));
  if (!reasonParsed.success) {
    redirect(
      pasajerosUrl({
        ...destino,
        comprobante: retorno.reservaId ? undefined : proofId,
        error: reasonParsed.error.issues[0]?.message ?? "Motivo inválido.",
      }),
    );
  }
  const reason = reasonParsed.data;

  let errorMessage: string | null = null;
  try {
    await rejectProof({ proofId, panelUserId: user.id, agencyId, reason });
  } catch (error) {
    const mensaje = userFacingMessage(error);
    if (mensaje === null) throw error;
    errorMessage = mensaje;
  }

  if (errorMessage) {
    redirect(
      pasajerosUrl({
        ...destino,
        comprobante: retorno.reservaId ? undefined : proofId,
        error: errorMessage,
      }),
    );
  }

  revalidatePath("/panel/pasajeros");
  revalidatePath("/panel");

  redirect(pasajerosUrl({ ...destino, ok: "rechazado" }));
}

export async function cashPaymentAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("payments.cash");
  const agencyId = requireAgencyScope(user);
  const origen = parsePanelOrigin(formData.get("origen"));
  const retorno = leerRetornoComun(formData);
  const destino = {
    vista: retorno.vista,
    pagina: retorno.pagina,
    salida: retorno.salida,
    buscar: retorno.buscar,
  };

  const reservationIdParsed = z.string().uuid().safeParse(formData.get("reservationId"));
  const reservationId = reservationIdParsed.success ? reservationIdParsed.data : undefined;

  function errorRedirect(mensaje: string): never {
    if (origen === "tablero") {
      redirect(panelFeedbackUrl("/panel", { registrar: "cobro", error: mensaje }));
    }
    if (reservationId) {
      redirect(pasajerosUrl({ ...destino, reserva: reservationId, error: mensaje }));
    }
    redirect(pasajerosUrl({ ...destino, registrar: "cobro", error: mensaje }));
  }

  // El cobro siempre llega desde el detalle de una reserva: la búsqueda por
  // código vive en `findCashReservationAction`, que abre ese detalle con el
  // titular y el saldo antes de cobrar.
  if (!reservationId) {
    errorRedirect("Indica la reserva a cobrar.");
  }

  const schema = z.object({
    amount: amountSchema,
    currency: z.enum(CURRENCIES, {
      errorMap: () => ({ message: "Selecciona una moneda válida." }),
    }),
  });
  const parsed = schema.safeParse({
    amount: formData.get("amount"),
    currency: formData.get("currency"),
  });
  if (!parsed.success) {
    errorRedirect(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }
  const { amount, currency } = parsed.data;

  let errorMessage: string | null = null;
  let shouldIssueTicket = false;
  try {
    // Si otro operador ya saldó la reserva (o se envió dos veces), el dominio
    // no registra nada: se avisa en vez de decir «Cobro registrado».
    const actual = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { status: true, departure: { select: { route: { select: { agencyId: true } } } } },
    });
    if (
      actual &&
      actual.departure.route.agencyId === agencyId &&
      (actual.status === "PAGADA" || actual.status === "ABORDADA")
    ) {
      throw new ValidationError(ALREADY_PAID_MESSAGE);
    }

    const resultado = await registerCashPayment({
      reservationId,
      panelUserId: user.id,
      agencyId,
      amount,
      currency: currency as Currency,
    });
    shouldIssueTicket = resultado.shouldIssueTicket;
    if (shouldIssueTicket) {
      await issueTicket(reservationId);
    }
  } catch (error) {
    const mensaje = userFacingMessage(error);
    if (mensaje === null) throw error;
    errorMessage = mensaje;
  }

  if (errorMessage) {
    errorRedirect(errorMessage);
  }

  revalidatePath("/panel/pasajeros");
  revalidatePath("/panel");

  const ok = shouldIssueTicket ? "cobro-ticket" : "cobro";

  if (origen === "tablero") {
    redirect(panelFeedbackUrl("/panel", { ok }));
  }
  redirect(pasajerosUrl({ ...destino, reserva: reservationId, ok }));
}
