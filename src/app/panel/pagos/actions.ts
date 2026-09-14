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
import { panelFeedbackUrl, userFacingMessage } from "../feedback";

const CURRENCIES = ["USD", "VES", "COP", "USDT"] as const;

const paginaSchema = z.coerce.number().int().min(1).catch(1);

/** Acepta coma o punto decimal y exige un número finito mayor que cero, como en `admin/tasas`. */
const amountSchema = z
  .string()
  .transform((v) => v.trim().replace(",", "."))
  .refine((v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0;
  }, "Ingresa un monto numérico mayor a cero.");

function pagosUrl(params: Record<string, string | number | undefined | null>): string {
  return panelFeedbackUrl("/panel/pagos", params);
}

export async function approveProofAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("payments.review");
  const agencyId = requireAgencyScope(user);

  const pagina = paginaSchema.parse(formData.get("pagina"));
  const paginaParam = pagina > 1 ? pagina : undefined;

  const proofIdParsed = z.string().uuid().safeParse(formData.get("proofId"));
  if (!proofIdParsed.success) {
    redirect(pagosUrl({ pagina: paginaParam, error: "Comprobante inválido." }));
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
    redirect(pagosUrl({ pagina: paginaParam, comprobante: proofId, error: errorMessage }));
  }

  revalidatePath("/panel/pagos");
  revalidatePath("/panel");
  revalidatePath("/panel/pasajeros");

  redirect(pagosUrl({ pagina: paginaParam, ok: "aprobado" }));
}

export async function rejectProofAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("payments.review");
  const agencyId = requireAgencyScope(user);

  const pagina = paginaSchema.parse(formData.get("pagina"));
  const paginaParam = pagina > 1 ? pagina : undefined;

  const proofIdParsed = z.string().uuid().safeParse(formData.get("proofId"));
  if (!proofIdParsed.success) {
    redirect(pagosUrl({ pagina: paginaParam, error: "Comprobante inválido." }));
  }
  const proofId = proofIdParsed.data;

  const reasonParsed = z
    .string()
    .trim()
    .min(4, "Indica el motivo del rechazo (mínimo 4 caracteres).")
    .safeParse(formData.get("reason"));
  if (!reasonParsed.success) {
    redirect(
      pagosUrl({
        pagina: paginaParam,
        comprobante: proofId,
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
    redirect(pagosUrl({ pagina: paginaParam, comprobante: proofId, error: errorMessage }));
  }

  revalidatePath("/panel/pagos");
  revalidatePath("/panel/pasajeros");

  redirect(pagosUrl({ pagina: paginaParam, ok: "rechazado" }));
}

export async function cashPaymentAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("payments.cash");
  const agencyId = requireAgencyScope(user);

  const pagina = paginaSchema.parse(formData.get("pagina"));
  const paginaParam = pagina > 1 ? pagina : undefined;

  const schema = z.object({
    code: z.string().trim().min(4, "Ingresa el serial del ticket."),
    amount: amountSchema,
    currency: z.enum(CURRENCIES, {
      errorMap: () => ({ message: "Selecciona una moneda válida." }),
    }),
  });
  const parsed = schema.safeParse({
    code: formData.get("code"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
  });
  if (!parsed.success) {
    redirect(
      pagosUrl({ pagina: paginaParam, error: parsed.error.issues[0]?.message ?? "Datos inválidos." }),
    );
  }
  const { code, amount, currency } = parsed.data;

  let errorMessage: string | null = null;
  let shouldIssueTicket = false;
  try {
    const reserva = await prisma.reservation.findUnique({
      where: { code: code.toUpperCase() },
      include: { departure: { include: { route: true } } },
    });
    if (!reserva || reserva.departure.route.agencyId !== agencyId) {
      throw new ValidationError("No existe ninguna reserva con ese serial en esta agencia.");
    }

    const resultado = await registerCashPayment({
      reservationId: reserva.id,
      panelUserId: user.id,
      agencyId,
      amount,
      currency: currency as Currency,
    });
    shouldIssueTicket = resultado.shouldIssueTicket;
    if (shouldIssueTicket) {
      await issueTicket(reserva.id);
    }
  } catch (error) {
    const mensaje = userFacingMessage(error);
    if (mensaje === null) throw error;
    errorMessage = mensaje;
  }

  if (errorMessage) {
    redirect(pagosUrl({ pagina: paginaParam, error: errorMessage }));
  }

  revalidatePath("/panel/pagos");
  revalidatePath("/panel/pasajeros");
  revalidatePath("/panel");

  redirect(pagosUrl({ pagina: paginaParam, ok: shouldIssueTicket ? "cobro-ticket" : "cobro" }));
}
