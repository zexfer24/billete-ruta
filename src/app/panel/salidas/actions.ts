"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { createDeparture } from "@/modules/catalog";
import { registerArrival, registerDeparture, startBoarding } from "@/modules/trips";
import { parsePanelOrigin } from "@/lib/panel-nav";
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

function tableroUrl(params: Record<string, string | number | undefined | null>): string {
  return panelFeedbackUrl("/panel", params);
}

function salidaDetalleUrl(
  departureId: string,
  params: Record<string, string | number | undefined | null>,
): string {
  return panelFeedbackUrl(`/panel/salidas/${departureId}`, params);
}

/** Nombre del campo del formulario al que apunta un error de zod, si es uno simple. */
function issueField(path: ReadonlyArray<string | number> | undefined): string | undefined {
  const first = path?.[0];
  return typeof first === "string" ? first : undefined;
}

export async function createDepartureAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("departures.manage");
  const agencyId = requireAgencyScope(user);
  const origen = parsePanelOrigin(formData.get("origen"));

  // `campo` le dice al formulario qué dato marcar en rojo; sin él, el error queda como aviso general.
  function errorRedirect(mensaje: string, campo?: string): never {
    if (origen === "tablero") {
      redirect(tableroUrl({ registrar: "salida", error: mensaje, campo }));
    }
    redirect(salidasUrl({ crear: 1, error: mensaje, campo }));
  }

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
    const issue = parsed.error.issues[0];
    errorRedirect(issue?.message ?? "Revisa los datos de la salida.", issueField(issue?.path));
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
    errorRedirect(errorMessage);
  }

  revalidatePath("/panel/salidas");
  revalidatePath("/panel");

  if (origen === "tablero") {
    redirect(tableroUrl({ ok: "salida-creada" }));
  }
  redirect(salidasUrl({ ok: "salida-creada" }));
}

export async function startBoardingAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("trips.manage");
  const agencyId = requireAgencyScope(user);
  const departureIdParsed = z.string().uuid().safeParse(formData.get("departureId"));
  if (!departureIdParsed.success) {
    redirect(salidasUrl({ error: "No encontramos esa salida. Ábrela de nuevo desde la lista." }));
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
  revalidatePath("/panel");

  redirect(salidaDetalleUrl(departureId, { ok: "embarque" }));
}

export async function registerDepartureAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("trips.manage");
  const agencyId = requireAgencyScope(user);
  const departureIdParsed = z.string().uuid().safeParse(formData.get("departureId"));
  if (!departureIdParsed.success) {
    redirect(salidasUrl({ error: "No encontramos esa salida. Ábrela de nuevo desde la lista." }));
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
  revalidatePath("/panel");

  redirect(salidaDetalleUrl(departureId, { ok: "salida" }));
}

export async function registerArrivalAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("trips.manage");
  const agencyId = requireAgencyScope(user);
  const departureIdParsed = z.string().uuid().safeParse(formData.get("departureId"));
  if (!departureIdParsed.success) {
    redirect(salidasUrl({ error: "No encontramos esa salida. Ábrela de nuevo desde la lista." }));
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
  revalidatePath("/panel/reportes");
  revalidatePath("/panel");

  redirect(salidaDetalleUrl(departureId, { ok: "llegada" }));
}
