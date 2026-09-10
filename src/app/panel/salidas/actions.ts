"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { createDeparture } from "@/modules/catalog";
import { registerArrival, registerDeparture, startBoarding } from "@/modules/trips";

/**
 * Une la fecha y la hora elegidas, siempre en hora de Caracas, y devuelve el
 * instante en UTC. Venezuela no observa horario de verano, así que el desfase
 * -04:00 es fijo. Se piden por separado para que la hora se elija en formato de
 * 24 horas y no dependa del idioma del navegador.
 */
function desdeFechaYHoraCaracas(fecha: string, hora: string): Date {
  return new Date(`${fecha}T${hora}:00.000-04:00`);
}

export async function createDepartureAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("departures.manage");
  const agencyId = requireAgencyScope(user);
  const schema = z.object({
    routeId: z.string().uuid(),
    vehicleId: z.string().uuid(),
    driverId: z.string().uuid(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha de la salida"),
    hora: z.string().regex(/^\d{2}:\d{2}$/, "Elige la hora de la salida"),
  });
  const data = schema.parse({
    routeId: formData.get("routeId"),
    vehicleId: formData.get("vehicleId"),
    driverId: formData.get("driverId"),
    fecha: formData.get("fecha"),
    hora: formData.get("hora"),
  });

  await createDeparture({
    agencyId,
    panelUserId: user.id,
    routeId: data.routeId,
    vehicleId: data.vehicleId,
    driverId: data.driverId,
    departsAt: desdeFechaYHoraCaracas(data.fecha, data.hora),
  });

  revalidatePath("/panel/salidas");
}

export async function startBoardingAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("trips.manage");
  const agencyId = requireAgencyScope(user);
  const departureId = z.string().uuid().parse(formData.get("departureId"));

  await startBoarding({ departureId, panelUserId: user.id, agencyId });

  revalidatePath(`/panel/salidas/${departureId}`);
  revalidatePath("/panel/salidas");
}

export async function registerDepartureAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("trips.manage");
  const agencyId = requireAgencyScope(user);
  const departureId = z.string().uuid().parse(formData.get("departureId"));

  await registerDeparture({ departureId, panelUserId: user.id, agencyId });

  revalidatePath(`/panel/salidas/${departureId}`);
  revalidatePath("/panel/salidas");
  revalidatePath("/panel/pasajeros");
}

export async function registerArrivalAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("trips.manage");
  const agencyId = requireAgencyScope(user);
  const departureId = z.string().uuid().parse(formData.get("departureId"));

  await registerArrival({ departureId, panelUserId: user.id, agencyId });

  revalidatePath(`/panel/salidas/${departureId}`);
  revalidatePath("/panel/salidas");
  revalidatePath("/panel/movimientos");
}
