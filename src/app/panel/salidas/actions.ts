"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { createDeparture } from "@/modules/catalog";
import { registerArrival, registerDeparture, startBoarding } from "@/modules/trips";
import { panelFeedbackUrl, userFacingMessage } from "../feedback";

/**
 * Une la fecha y la hora elegidas, siempre en hora de Caracas, y devuelve el
 * instante en UTC. Venezuela no observa horario de verano, así que el desfase
 * -04:00 es fijo. Se piden por separado para que la hora se elija en formato de
 * 24 horas y no dependa del idioma del navegador.
 */
function desdeFechaYHoraCaracas(fecha: string, hora: string): Date {
  return new Date(`${fecha}T${hora}:00.000-04:00`);
}

function salidasUrl(params: Record<string, string | number | undefined | null>): string {
  return panelFeedbackUrl("/panel/salidas", params);
}

function salidaDetalleUrl(
  departureId: string,
  params: Record<string, string | number | undefined | null>,
): string {
  return panelFeedbackUrl(`/panel/salidas/${departureId}`, params);
}

export async function createDepartureAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("departures.manage");
  const agencyId = requireAgencyScope(user);
  const schema = z.object({
    routeId: z.string().uuid("Elige la ruta de la salida."),
    vehicleId: z.string().uuid("Elige el vehículo."),
    driverId: z.string().uuid("Elige el chofer."),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha de la salida."),
    hora: z.string().regex(/^\d{2}:\d{2}$/, "Elige la hora de la salida."),
  });
  const parsed = schema.safeParse({
    routeId: formData.get("routeId"),
    vehicleId: formData.get("vehicleId"),
    driverId: formData.get("driverId"),
    fecha: formData.get("fecha"),
    hora: formData.get("hora"),
  });
  if (!parsed.success) {
    redirect(salidasUrl({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }));
  }
  const data = parsed.data;

  let errorMessage: string | null = null;
  try {
    await createDeparture({
      agencyId,
      panelUserId: user.id,
      routeId: data.routeId,
      vehicleId: data.vehicleId,
      driverId: data.driverId,
      departsAt: desdeFechaYHoraCaracas(data.fecha, data.hora),
    });
  } catch (error) {
    const mensaje = userFacingMessage(error);
    if (mensaje === null) throw error;
    errorMessage = mensaje;
  }

  if (errorMessage) {
    redirect(salidasUrl({ error: errorMessage }));
  }

  revalidatePath("/panel/salidas");

  redirect(salidasUrl({ ok: "salida-creada" }));
}

export async function startBoardingAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("trips.manage");
  const agencyId = requireAgencyScope(user);
  const departureIdParsed = z.string().uuid().safeParse(formData.get("departureId"));
  if (!departureIdParsed.success) {
    redirect(salidasUrl({ error: "Salida inválida." }));
  }
  const departureId = departureIdParsed.data;

  let errorMessage: string | null = null;
  try {
    await startBoarding({ departureId, panelUserId: user.id, agencyId });
  } catch (error) {
    const mensaje = userFacingMessage(error);
    if (mensaje === null) throw error;
    errorMessage = mensaje;
  }

  if (errorMessage) {
    redirect(salidaDetalleUrl(departureId, { error: errorMessage }));
  }

  revalidatePath(`/panel/salidas/${departureId}`);
  revalidatePath("/panel/salidas");

  redirect(salidaDetalleUrl(departureId, { ok: "embarque" }));
}

export async function registerDepartureAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("trips.manage");
  const agencyId = requireAgencyScope(user);
  const departureIdParsed = z.string().uuid().safeParse(formData.get("departureId"));
  if (!departureIdParsed.success) {
    redirect(salidasUrl({ error: "Salida inválida." }));
  }
  const departureId = departureIdParsed.data;

  let errorMessage: string | null = null;
  try {
    await registerDeparture({ departureId, panelUserId: user.id, agencyId });
  } catch (error) {
    const mensaje = userFacingMessage(error);
    if (mensaje === null) throw error;
    errorMessage = mensaje;
  }

  if (errorMessage) {
    redirect(salidaDetalleUrl(departureId, { error: errorMessage }));
  }

  revalidatePath(`/panel/salidas/${departureId}`);
  revalidatePath("/panel/salidas");
  revalidatePath("/panel/pasajeros");

  redirect(salidaDetalleUrl(departureId, { ok: "salida" }));
}

export async function registerArrivalAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("trips.manage");
  const agencyId = requireAgencyScope(user);
  const departureIdParsed = z.string().uuid().safeParse(formData.get("departureId"));
  if (!departureIdParsed.success) {
    redirect(salidasUrl({ error: "Salida inválida." }));
  }
  const departureId = departureIdParsed.data;

  let errorMessage: string | null = null;
  try {
    await registerArrival({ departureId, panelUserId: user.id, agencyId });
  } catch (error) {
    const mensaje = userFacingMessage(error);
    if (mensaje === null) throw error;
    errorMessage = mensaje;
  }

  if (errorMessage) {
    redirect(salidaDetalleUrl(departureId, { error: errorMessage }));
  }

  revalidatePath(`/panel/salidas/${departureId}`);
  revalidatePath("/panel/salidas");
  revalidatePath("/panel/movimientos");

  redirect(salidaDetalleUrl(departureId, { ok: "llegada" }));
}
