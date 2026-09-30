"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePanelUser } from "@/modules/auth";
import { createAgencyWithOperator, setAgencyActive } from "@/modules/agencies";
import { panelFeedbackUrl, userFacingMessage } from "@/app/panel/feedback";

const PAGE_PATH = "/panel/admin/agencias";

const createAgencySchema = z.object({
  name: z.string().trim().min(3, "Escribe el nombre de la agencia (al menos 3 letras)."),
  taxId: z.string().trim().min(3, "Escribe el RIF de la agencia."),
  contactPhone: z.string().trim().min(6, "Escribe el teléfono de contacto de la agencia."),
  contactEmail: z.string().trim().email("El correo de contacto no es válido. Revisa que tenga @ y un dominio."),
  operatorName: z.string().trim().min(3, "Escribe el nombre del operador (al menos 3 letras)."),
  operatorEmail: z.string().trim().email("El correo del operador no es válido. Revisa que tenga @ y un dominio."),
  operatorPassword: z.string().min(8, "La contraseña del operador debe tener al menos 8 caracteres."),
});

/**
 * Alta de una agencia junto con su primer usuario operador. Si falla, vuelve
 * al panel de registro abierto (`?registrar=agencia`) con el motivo.
 */
export async function createAgencyAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("terminal.agencies");

  const parsed = createAgencySchema.safeParse({
    name: formData.get("name") ?? "",
    taxId: formData.get("taxId") ?? "",
    contactPhone: formData.get("contactPhone") ?? "",
    contactEmail: formData.get("contactEmail") ?? "",
    operatorName: formData.get("operatorName") ?? "",
    operatorEmail: formData.get("operatorEmail") ?? "",
    operatorPassword: formData.get("operatorPassword") ?? "",
  });

  let error: string | null = null;
  if (!parsed.success) {
    error = parsed.error.issues[0]?.message ?? "Revisa los datos de la agencia.";
  } else {
    try {
      await createAgencyWithOperator({ ...parsed.data, panelUserId: user.id });
    } catch (caught) {
      error = userFacingMessage(caught);
      if (error === null) throw caught;
    }
  }

  if (error) redirect(panelFeedbackUrl(PAGE_PATH, { registrar: "agencia", error }));

  revalidatePath(PAGE_PATH);
  redirect(panelFeedbackUrl(PAGE_PATH, { ok: "agencia-creada" }));
}

const toggleSchema = z.object({
  agencyId: z.string().uuid("No encontramos la agencia. Recarga la página e inténtalo de nuevo."),
  active: z.enum(["true", "false"], { message: "No se entendió el cambio pedido. Inténtalo de nuevo." }),
});

/** Activa o desactiva una agencia existente. */
export async function toggleAgencyAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("terminal.agencies");

  const parsed = toggleSchema.safeParse({
    agencyId: formData.get("agencyId") ?? "",
    active: formData.get("active") ?? "",
  });

  let error: string | null = null;
  let active = false;
  if (!parsed.success) {
    error = parsed.error.issues[0]?.message ?? "No se pudo cambiar el estado de la agencia.";
  } else {
    active = parsed.data.active === "true";
    try {
      await setAgencyActive({ agencyId: parsed.data.agencyId, active, panelUserId: user.id });
    } catch (caught) {
      error = userFacingMessage(caught);
      if (error === null) throw caught;
    }
  }

  if (error) redirect(panelFeedbackUrl(PAGE_PATH, { error }));

  revalidatePath(PAGE_PATH);
  redirect(panelFeedbackUrl(PAGE_PATH, { ok: active ? "agencia-activada" : "agencia-desactivada" }));
}
