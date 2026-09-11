"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Currency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { approveProof, registerCashPayment, rejectProof } from "@/modules/payments";
import { issueTicket } from "@/modules/tickets";

const CURRENCIES = ["USD", "VES", "COP", "USDT"] as const;

const paginaSchema = z.coerce.number().int().min(1).catch(1);

export async function approveProofAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("payments.review");
  const agencyId = requireAgencyScope(user);
  const proofId = z.string().uuid().parse(formData.get("proofId"));
  const pagina = paginaSchema.parse(formData.get("pagina"));

  const resultado = await approveProof({ proofId, panelUserId: user.id, agencyId });
  if (resultado.shouldIssueTicket) {
    await issueTicket(resultado.reservationId);
  }

  revalidatePath("/panel/pagos");
  revalidatePath("/panel");
  revalidatePath("/panel/pasajeros");

  redirect(pagina > 1 ? `/panel/pagos?pagina=${pagina}` : "/panel/pagos");
}

export async function rejectProofAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("payments.review");
  const agencyId = requireAgencyScope(user);
  const schema = z.object({ proofId: z.string().uuid(), reason: z.string().trim().min(4) });
  const { proofId, reason } = schema.parse({
    proofId: formData.get("proofId"),
    reason: formData.get("reason"),
  });
  const pagina = paginaSchema.parse(formData.get("pagina"));

  await rejectProof({ proofId, panelUserId: user.id, agencyId, reason });

  revalidatePath("/panel/pagos");
  revalidatePath("/panel/pasajeros");

  redirect(pagina > 1 ? `/panel/pagos?pagina=${pagina}` : "/panel/pagos");
}

export async function cashPaymentAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("payments.cash");
  const agencyId = requireAgencyScope(user);
  const schema = z.object({
    code: z.string().trim().min(4),
    amount: z.string().trim().min(1),
    currency: z.enum(CURRENCIES),
  });
  const { code, amount, currency } = schema.parse({
    code: formData.get("code"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
  });

  const reserva = await prisma.reservation.findUnique({
    where: { code: code.toUpperCase() },
    include: { departure: { include: { route: true } } },
  });
  if (!reserva || reserva.departure.route.agencyId !== agencyId) {
    throw new Error("No existe ninguna reserva con ese serial en esta agencia.");
  }

  const resultado = await registerCashPayment({
    reservationId: reserva.id,
    panelUserId: user.id,
    agencyId,
    amount,
    currency: currency as Currency,
  });
  if (resultado.shouldIssueTicket) {
    await issueTicket(reserva.id);
  }

  revalidatePath("/panel/pagos");
  revalidatePath("/panel/pasajeros");
  revalidatePath("/panel");
}
