import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isValidIdNumber, normalizeIdNumber, normalizePhone } from "@/lib/identity";
import { writeAudit } from "@/modules/audit";
import { ForbiddenError } from "@/modules/auth/permissions";
import { ValidationError } from "@/modules/booking/errors";

// --- Vehículos --------------------------------------------------------------

export interface VehicleInput {
  agencyId: string;
  plate: string;
  brand: string;
  model: string;
  seatCount: number;
  panelUserId: string;
}

function normalizePlate(plate: string): string {
  return plate.toUpperCase().replace(/[\s-]/g, "");
}

export async function createVehicle(input: VehicleInput): Promise<{ vehicleId: string }> {
  const plate = normalizePlate(input.plate);
  if (plate.length < 5 || plate.length > 10) {
    throw new ValidationError("La placa debe tener entre 5 y 10 caracteres.");
  }
  if (!Number.isInteger(input.seatCount) || input.seatCount < 4 || input.seatCount > 80) {
    throw new ValidationError("El número de asientos debe estar entre 4 y 80.");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const vehiculo = await tx.vehicle.create({
        data: {
          agencyId: input.agencyId,
          plate,
          brand: input.brand.trim(),
          model: input.model.trim(),
          seatCount: input.seatCount,
        },
      });
      await writeAudit(tx, {
        actorType: "PANEL",
        actorPanelUserId: input.panelUserId,
        entityType: "Vehicle",
        entityId: vehiculo.id,
        action: "VEHICULO_CREADO",
        after: { plate, brand: vehiculo.brand, model: vehiculo.model, seatCount: input.seatCount },
      });
      return { vehicleId: vehiculo.id };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ValidationError(`Ya tienes un vehículo registrado con la placa ${plate}.`);
    }
    throw error;
  }
}

export async function updateVehicle(input: {
  vehicleId: string;
  agencyId: string;
  panelUserId: string;
  brand?: string;
  model?: string;
  seatCount?: number;
  active?: boolean;
}): Promise<void> {
  const vehiculo = await prisma.vehicle.findUniqueOrThrow({ where: { id: input.vehicleId } });
  if (vehiculo.agencyId !== input.agencyId) {
    throw new ForbiddenError("OPERADOR", "fleet.manage");
  }
  if (
    input.seatCount !== undefined &&
    (!Number.isInteger(input.seatCount) || input.seatCount < 4 || input.seatCount > 80)
  ) {
    throw new ValidationError("El número de asientos debe estar entre 4 y 80.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.vehicle.update({
      where: { id: input.vehicleId },
      data: {
        brand: input.brand?.trim(),
        model: input.model?.trim(),
        seatCount: input.seatCount,
        active: input.active,
      },
    });
    await writeAudit(tx, {
      actorType: "PANEL",
      actorPanelUserId: input.panelUserId,
      entityType: "Vehicle",
      entityId: input.vehicleId,
      action: "VEHICULO_ACTUALIZADO",
      before: { brand: vehiculo.brand, model: vehiculo.model, seatCount: vehiculo.seatCount, active: vehiculo.active },
      after: { brand: input.brand, model: input.model, seatCount: input.seatCount, active: input.active },
    });
  });
}

export async function listVehicles(agencyId: string) {
  return prisma.vehicle.findMany({
    where: { agencyId },
    orderBy: [{ active: "desc" }, { plate: "asc" }],
  });
}

// --- Choferes ---------------------------------------------------------------

export interface DriverInput {
  agencyId: string;
  fullName: string;
  idNumber: string;
  phone: string;
  panelUserId: string;
}

export async function createDriver(input: DriverInput): Promise<{ driverId: string }> {
  const idNumber = normalizeIdNumber(input.idNumber);
  if (!isValidIdNumber(idNumber)) {
    throw new ValidationError("La cédula del chofer no tiene un formato válido.");
  }
  if (input.fullName.trim().length < 3) {
    throw new ValidationError("Escribe el nombre completo del chofer.");
  }
  const phone = normalizePhone(input.phone);

  try {
    return await prisma.$transaction(async (tx) => {
      const chofer = await tx.driver.create({
        data: {
          agencyId: input.agencyId,
          fullName: input.fullName.trim(),
          idNumber,
          phone,
        },
      });
      await writeAudit(tx, {
        actorType: "PANEL",
        actorPanelUserId: input.panelUserId,
        entityType: "Driver",
        entityId: chofer.id,
        action: "CHOFER_CREADO",
        after: { fullName: chofer.fullName, idNumber },
      });
      return { driverId: chofer.id };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ValidationError(`Ya tienes un chofer registrado con la cédula ${idNumber}.`);
    }
    throw error;
  }
}

export async function updateDriver(input: {
  driverId: string;
  agencyId: string;
  panelUserId: string;
  fullName?: string;
  phone?: string;
  active?: boolean;
}): Promise<void> {
  const chofer = await prisma.driver.findUniqueOrThrow({ where: { id: input.driverId } });
  if (chofer.agencyId !== input.agencyId) {
    throw new ForbiddenError("OPERADOR", "fleet.manage");
  }
  await prisma.$transaction(async (tx) => {
    await tx.driver.update({
      where: { id: input.driverId },
      data: {
        fullName: input.fullName?.trim(),
        phone: input.phone ? normalizePhone(input.phone) : undefined,
        active: input.active,
      },
    });
    await writeAudit(tx, {
      actorType: "PANEL",
      actorPanelUserId: input.panelUserId,
      entityType: "Driver",
      entityId: input.driverId,
      action: "CHOFER_ACTUALIZADO",
      before: { fullName: chofer.fullName, phone: chofer.phone, active: chofer.active },
      after: { fullName: input.fullName, phone: input.phone, active: input.active },
    });
  });
}

export interface DriverWithCounts {
  id: string;
  fullName: string;
  idNumber: string;
  phone: string;
  active: boolean;
  /** Viajes en los que el chofer registró la salida. */
  boardingCount: number;
  /** Viajes en los que el chofer registró la llegada. */
  arrivalCount: number;
}

/** Choferes de la agencia con su total de embarques y desembarques. */
export async function listDrivers(agencyId: string): Promise<DriverWithCounts[]> {
  const choferes = await prisma.driver.findMany({
    where: { agencyId },
    orderBy: [{ active: "desc" }, { fullName: "asc" }],
    include: {
      tripLogs: { select: { departedAt: true, arrivedAt: true } },
    },
  });
  return choferes.map((chofer) => ({
    id: chofer.id,
    fullName: chofer.fullName,
    idNumber: chofer.idNumber,
    phone: chofer.phone,
    active: chofer.active,
    boardingCount: chofer.tripLogs.filter((t) => t.departedAt !== null).length,
    arrivalCount: chofer.tripLogs.filter((t) => t.arrivedAt !== null).length,
  }));
}
