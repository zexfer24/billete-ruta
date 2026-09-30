"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { createDriver, createVehicle, updateDriver, updateVehicle } from "@/modules/agencies";
import { parsePanelOrigin } from "@/lib/panel-nav";
import { panelFeedbackUrl, userFacingMessage } from "../feedback";

const ACTIVE = z.enum(["true", "false"], {
  errorMap: () => ({ message: "Elige si está disponible o fuera de servicio." }),
});

function flotaUrl(
  vista: "vehiculos" | "choferes",
  params: Record<string, string | number | undefined | null>,
): string {
  return panelFeedbackUrl("/panel/flota", { vista, ...params });
}

function tableroUrl(params: Record<string, string | number | undefined | null>): string {
  return panelFeedbackUrl("/panel", params);
}

/** Nombre del campo del formulario al que apunta un error de zod, si es uno simple. */
function issueField(path: ReadonlyArray<string | number> | undefined): string | undefined {
  const first = path?.[0];
  return typeof first === "string" ? first : undefined;
}

/**
 * Campo al que corresponde un error del dominio de flota, según su texto
 * (src/modules/agencies/fleet.ts). Solo sirve para marcar el campo en rojo:
 * si no se reconoce, el error queda como aviso general del formulario.
 */
function fieldFromMessage(mensaje: string): string | undefined {
  if (/placa/i.test(mensaje)) return "plate";
  if (/asientos|puestos/i.test(mensaje)) return "seatCount";
  if (/c[ée]dula/i.test(mensaje)) return "idNumber";
  if (/tel[ée]fono/i.test(mensaje)) return "phone";
  if (/nombre/i.test(mensaje)) return "fullName";
  return undefined;
}

/** Número entero de puestos, con el mismo rango que valida el dominio. */
const SEAT_COUNT = z.coerce
  .number({ invalid_type_error: "Escribe el número de puestos con cifras." })
  .int("Escribe un número entero de puestos, sin decimales.")
  .min(4, "El vehículo debe tener al menos 4 puestos.")
  .max(80, "El vehículo puede tener como máximo 80 puestos.");

export async function createVehicleAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("fleet.manage");
  const agencyId = requireAgencyScope(user);
  const origen = parsePanelOrigin(formData.get("origen"));

  const schema = z.object({
    plate: z.string().trim().min(1, "Ingresa la placa."),
    brand: z.string().trim().min(1, "Ingresa la marca."),
    model: z.string().trim().min(1, "Ingresa el modelo."),
    seatCount: SEAT_COUNT,
  });
  const parsed = schema.safeParse({
    plate: formData.get("plate"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    seatCount: formData.get("seatCount"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const error = issue?.message ?? "Revisa los datos del vehículo.";
    const campo = issueField(issue?.path);
    if (origen === "tablero") {
      redirect(tableroUrl({ registrar: "vehiculo", error, campo }));
    }
    redirect(flotaUrl("vehiculos", { registrar: "vehiculo", error, campo }));
  }
  const data = parsed.data;

  let errorMessage: string | null = null;
  try {
    await createVehicle({ ...data, agencyId, panelUserId: user.id });
  } catch (error) {
    const mensaje = userFacingMessage(error);
    if (mensaje === null) throw error;
    errorMessage = mensaje;
  }

  if (errorMessage) {
    const campo = fieldFromMessage(errorMessage);
    if (origen === "tablero") {
      redirect(tableroUrl({ registrar: "vehiculo", error: errorMessage, campo }));
    }
    redirect(flotaUrl("vehiculos", { registrar: "vehiculo", error: errorMessage, campo }));
  }

  revalidatePath("/panel/flota");
  revalidatePath("/panel");

  if (origen === "tablero") {
    redirect(tableroUrl({ ok: "vehiculo-creado" }));
  }
  redirect(flotaUrl("vehiculos", { ok: "vehiculo-creado" }));
}

export async function updateVehicleAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("fleet.manage");
  const agencyId = requireAgencyScope(user);

  const vehicleIdParsed = z.string().uuid().safeParse(formData.get("vehicleId"));
  if (!vehicleIdParsed.success) {
    redirect(flotaUrl("vehiculos", { error: "No encontramos ese vehículo. Ábrelo de nuevo desde la lista." }));
  }
  const vehicleId = vehicleIdParsed.data;

  const schema = z.object({
    brand: z.string().trim().min(1, "Ingresa la marca."),
    model: z.string().trim().min(1, "Ingresa el modelo."),
    seatCount: SEAT_COUNT,
    active: ACTIVE,
  });
  const parsed = schema.safeParse({
    brand: formData.get("brand"),
    model: formData.get("model"),
    seatCount: formData.get("seatCount"),
    active: formData.get("active"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    redirect(
      flotaUrl("vehiculos", {
        editar: vehicleId,
        error: issue?.message ?? "Revisa los datos del vehículo.",
        campo: issueField(issue?.path),
      }),
    );
  }
  const data = parsed.data;

  let errorMessage: string | null = null;
  try {
    await updateVehicle({
      vehicleId,
      agencyId,
      panelUserId: user.id,
      brand: data.brand,
      model: data.model,
      seatCount: data.seatCount,
      active: data.active === "true",
    });
  } catch (error) {
    const mensaje = userFacingMessage(error);
    if (mensaje === null) throw error;
    errorMessage = mensaje;
  }

  if (errorMessage) {
    redirect(
      flotaUrl("vehiculos", { editar: vehicleId, error: errorMessage, campo: fieldFromMessage(errorMessage) }),
    );
  }

  revalidatePath("/panel/flota");

  redirect(flotaUrl("vehiculos", { ok: "vehiculo-actualizado" }));
}

export async function createDriverAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("fleet.manage");
  const agencyId = requireAgencyScope(user);
  const origen = parsePanelOrigin(formData.get("origen"));

  const schema = z.object({
    fullName: z.string().trim().min(1, "Ingresa el nombre completo."),
    idNumber: z.string().trim().min(1, "Ingresa la cédula."),
    phone: z.string().trim().min(1, "Ingresa el teléfono."),
  });
  const parsed = schema.safeParse({
    fullName: formData.get("fullName"),
    idNumber: formData.get("idNumber"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const error = issue?.message ?? "Revisa los datos del chofer.";
    const campo = issueField(issue?.path);
    if (origen === "tablero") {
      redirect(tableroUrl({ registrar: "chofer", error, campo }));
    }
    redirect(flotaUrl("choferes", { registrar: "chofer", error, campo }));
  }
  const data = parsed.data;

  let errorMessage: string | null = null;
  try {
    await createDriver({ ...data, agencyId, panelUserId: user.id });
  } catch (error) {
    const mensaje = userFacingMessage(error);
    if (mensaje === null) throw error;
    errorMessage = mensaje;
  }

  if (errorMessage) {
    const campo = fieldFromMessage(errorMessage);
    if (origen === "tablero") {
      redirect(tableroUrl({ registrar: "chofer", error: errorMessage, campo }));
    }
    redirect(flotaUrl("choferes", { registrar: "chofer", error: errorMessage, campo }));
  }

  revalidatePath("/panel/flota");
  revalidatePath("/panel");

  if (origen === "tablero") {
    redirect(tableroUrl({ ok: "chofer-creado" }));
  }
  redirect(flotaUrl("choferes", { ok: "chofer-creado" }));
}

export async function updateDriverAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("fleet.manage");
  const agencyId = requireAgencyScope(user);

  const driverIdParsed = z.string().uuid().safeParse(formData.get("driverId"));
  if (!driverIdParsed.success) {
    redirect(flotaUrl("choferes", { error: "No encontramos ese chofer. Ábrelo de nuevo desde la lista." }));
  }
  const driverId = driverIdParsed.data;

  const schema = z.object({
    fullName: z.string().trim().min(1, "Ingresa el nombre completo."),
    phone: z.string().trim().min(1, "Ingresa el teléfono."),
    active: ACTIVE,
  });
  const parsed = schema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    active: formData.get("active"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    redirect(
      flotaUrl("choferes", {
        editar: driverId,
        error: issue?.message ?? "Revisa los datos del chofer.",
        campo: issueField(issue?.path),
      }),
    );
  }
  const data = parsed.data;

  let errorMessage: string | null = null;
  try {
    await updateDriver({
      driverId,
      agencyId,
      panelUserId: user.id,
      fullName: data.fullName,
      phone: data.phone,
      active: data.active === "true",
    });
  } catch (error) {
    const mensaje = userFacingMessage(error);
    if (mensaje === null) throw error;
    errorMessage = mensaje;
  }

  if (errorMessage) {
    redirect(
      flotaUrl("choferes", { editar: driverId, error: errorMessage, campo: fieldFromMessage(errorMessage) }),
    );
  }

  revalidatePath("/panel/flota");

  redirect(flotaUrl("choferes", { ok: "chofer-actualizado" }));
}
