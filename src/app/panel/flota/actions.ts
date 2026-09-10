"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { createDriver, createVehicle, updateDriver, updateVehicle } from "@/modules/agencies";

const ACTIVE = z.enum(["true", "false"]);

export async function createVehicleAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("fleet.manage");
  const agencyId = requireAgencyScope(user);
  const schema = z.object({
    plate: z.string().trim().min(1),
    brand: z.string().trim().min(1),
    model: z.string().trim().min(1),
    seatCount: z.coerce.number().int(),
  });
  const data = schema.parse({
    plate: formData.get("plate"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    seatCount: formData.get("seatCount"),
  });

  await createVehicle({ ...data, agencyId, panelUserId: user.id });
  revalidatePath("/panel/vehiculos");
}

export async function updateVehicleAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("fleet.manage");
  const agencyId = requireAgencyScope(user);
  const schema = z.object({
    vehicleId: z.string().uuid(),
    brand: z.string().trim().min(1),
    model: z.string().trim().min(1),
    seatCount: z.coerce.number().int(),
    active: ACTIVE,
  });
  const data = schema.parse({
    vehicleId: formData.get("vehicleId"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    seatCount: formData.get("seatCount"),
    active: formData.get("active"),
  });

  await updateVehicle({
    vehicleId: data.vehicleId,
    agencyId,
    panelUserId: user.id,
    brand: data.brand,
    model: data.model,
    seatCount: data.seatCount,
    active: data.active === "true",
  });
  revalidatePath("/panel/vehiculos");
}

export async function createDriverAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("fleet.manage");
  const agencyId = requireAgencyScope(user);
  const schema = z.object({
    fullName: z.string().trim().min(1),
    idNumber: z.string().trim().min(1),
    phone: z.string().trim().min(1),
  });
  const data = schema.parse({
    fullName: formData.get("fullName"),
    idNumber: formData.get("idNumber"),
    phone: formData.get("phone"),
  });

  await createDriver({ ...data, agencyId, panelUserId: user.id });
  revalidatePath("/panel/choferes");
}

export async function updateDriverAction(formData: FormData): Promise<void> {
  const user = await requirePanelUser("fleet.manage");
  const agencyId = requireAgencyScope(user);
  const schema = z.object({
    driverId: z.string().uuid(),
    fullName: z.string().trim().min(1),
    phone: z.string().trim().min(1),
    active: ACTIVE,
  });
  const data = schema.parse({
    driverId: formData.get("driverId"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    active: formData.get("active"),
  });

  await updateDriver({
    driverId: data.driverId,
    agencyId,
    panelUserId: user.id,
    fullName: data.fullName,
    phone: data.phone,
    active: data.active === "true",
  });
  revalidatePath("/panel/choferes");
}
