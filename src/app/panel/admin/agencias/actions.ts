"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePanelUser } from "@/modules/auth";
import { createAgencyWithOperator, setAgencyActive } from "@/modules/agencies";
import { ValidationError } from "@/modules/booking/errors";

const PAGE_PATH = "/panel/admin/agencias";

function redirectWithError(message: string): never {
  redirect(`${PAGE_PATH}?error=${encodeURIComponent(message)}`);
}

const createAgencySchema = z.object({
  name: z.string().min(3, "El nombre de la agencia es demasiado corto."),
  taxId: z.string().min(3, "El RIF es obligatorio."),
  contactPhone: z.string().min(6, "El teléfono de contacto es obligatorio."),
  contactEmail: z.string().email("El correo de contacto no es válido."),
  operatorName: z.string().min(3, "El nombre del operador es obligatorio."),
  operatorEmail: z.string().email("El correo del operador no es válido."),
  operatorPassword: z.string().min(8, "La contraseña del operador debe tener al menos 8 caracteres."),
});

/** Alta de una agencia junto con su primer usuario operador. */
export async function createAgencyAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("terminal.agencies");

  const parsed = createAgencySchema.safeParse({
    name: formData.get("name"),
    taxId: formData.get("taxId"),
    contactPhone: formData.get("contactPhone"),
    contactEmail: formData.get("contactEmail"),
    operatorName: formData.get("operatorName"),
    operatorEmail: formData.get("operatorEmail"),
    operatorPassword: formData.get("operatorPassword"),
  });
  if (!parsed.success) {
    redirectWithError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  try {
    await createAgencyWithOperator({ ...parsed.data, panelUserId: user.id });
  } catch (error) {
    if (error instanceof ValidationError) redirectWithError(error.message);
    throw error;
  }

  revalidatePath(PAGE_PATH);
  redirect(`${PAGE_PATH}?ok=1`);
}

/** Activa o desactiva una agencia existente. */
export async function toggleAgencyAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("terminal.agencies");

  const agencyId = String(formData.get("agencyId") ?? "");
  const active = formData.get("active") === "true";
  if (!agencyId) redirectWithError("Falta el identificador de la agencia.");

  await setAgencyActive({ agencyId, active, panelUserId: user.id });

  revalidatePath(PAGE_PATH);
  redirect(`${PAGE_PATH}?ok=1`);
}
