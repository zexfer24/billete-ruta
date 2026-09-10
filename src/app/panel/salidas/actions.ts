"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { createDeparture } from "@/modules/catalog";
import { registerArrival, registerDeparture, startBoarding } from "@/modules/trips";

/**
 * Convierte el valor de un <input type="datetime-local"> — que representa
 * siempre hora de Caracas en este panel — a un instante UTC. Venezuela no
 * observa horario de verano, así que el desfase -04:00 es fijo.
 */
function fromCaracasLocalInput(value: string): Date {
  return new Date(`${value}:00-04:00`);
}

export async function createDepartureAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("departures.manage");
  const agencyId = requireAgencyScope(user);
  const schema = z.object({
    routeId: z.string().uuid(),
    vehicleId: z.string().uuid(),
    driverId: z.string().uuid(),
    departsAt: z.string().min(1),
  });
  const data = schema.parse({
    routeId: formData.get("routeId"),
    vehicleId: formData.get("vehicleId"),
    driverId: formData.get("driverId"),
    departsAt: formData.get("departsAt"),
  });

  await createDeparture({
    agencyId,
    panelUserId: user.id,
    routeId: data.routeId,
    vehicleId: data.vehicleId,
    driverId: data.driverId,
    departsAt: fromCaracasLocalInput(data.departsAt),
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
