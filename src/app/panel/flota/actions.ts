"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { createDriver, createVehicle, updateDriver, updateVehicle } from "@/modules/agencies";
import { parsePanelOrigin } from "@/lib/panel-nav";
import { panelFeedbackUrl, userFacingMessage } from "../feedback";

const ACTIVE = z.enum(["true", "false"]);

function flotaUrl(
  vista: "vehiculos" | "choferes",
  params: Record<string, string | number | undefined | null>,
): string {
  return panelFeedbackUrl("/panel/flota", { vista, ...params });
}

function tableroUrl(params: Record<string, string | number | undefined | null>): string {
  return panelFeedbackUrl("/panel", params);
}

export async function createVehicleAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("fleet.manage");
  const agencyId = requireAgencyScope(user);
  const origen = parsePanelOrigin(formData.get("origen"));

  const schema = z.object({
    plate: z.string().trim().min(1, "Ingresa la placa."),
    brand: z.string().trim().min(1, "Ingresa la marca."),
    model: z.string().trim().min(1, "Ingresa el modelo."),
    seatCount: z.coerce.number().int("Ingresa un número de asientos válido."),
  });
  const parsed = schema.safeParse({
    plate: formData.get("plate"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    seatCount: formData.get("seatCount"),
  });
  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message ?? "Datos inválidos.";
    if (origen === "tablero") {
      redirect(tableroUrl({ registrar: "vehiculo", error }));
    }
    redirect(flotaUrl("vehiculos", { registrar: "vehiculo", error }));
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
    if (origen === "tablero") {
      redirect(tableroUrl({ registrar: "vehiculo", error: errorMessage }));
    }
    redirect(flotaUrl("vehiculos", { registrar: "vehiculo", error: errorMessage }));
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
    redirect(flotaUrl("vehiculos", { error: "Vehículo inválido." }));
  }
  const vehicleId = vehicleIdParsed.data;

  const schema = z.object({
    brand: z.string().trim().min(1, "Ingresa la marca."),
    model: z.string().trim().min(1, "Ingresa el modelo."),
    seatCount: z.coerce.number().int("Ingresa un número de asientos válido."),
    active: ACTIVE,
  });
  const parsed = schema.safeParse({
    brand: formData.get("brand"),
    model: formData.get("model"),
    seatCount: formData.get("seatCount"),
    active: formData.get("active"),
  });
  if (!parsed.success) {
    redirect(
      flotaUrl("vehiculos", {
        editar: vehicleId,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
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
    redirect(flotaUrl("vehiculos", { editar: vehicleId, error: errorMessage }));
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
    const error = parsed.error.issues[0]?.message ?? "Datos inválidos.";
    if (origen === "tablero") {
      redirect(tableroUrl({ registrar: "chofer", error }));
    }
    redirect(flotaUrl("choferes", { registrar: "chofer", error }));
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
    if (origen === "tablero") {
      redirect(tableroUrl({ registrar: "chofer", error: errorMessage }));
    }
    redirect(flotaUrl("choferes", { registrar: "chofer", error: errorMessage }));
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
    redirect(flotaUrl("choferes", { error: "Chofer inválido." }));
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
    redirect(
      flotaUrl("choferes", {
        editar: driverId,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
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
    redirect(flotaUrl("choferes", { editar: driverId, error: errorMessage }));
  }

  revalidatePath("/panel/flota");

  redirect(flotaUrl("choferes", { ok: "chofer-actualizado" }));
}
