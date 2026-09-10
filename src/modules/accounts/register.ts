import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  isValidBirthYear,
  isValidIdNumber,
  isValidPhone,
  normalizeIdNumber,
  normalizePhone,
} from "@/lib/identity";
import { writeAudit } from "@/modules/audit";
import { hashPassword, verifyPassword } from "@/modules/auth/passwords";
import { createPassengerSession } from "@/modules/auth/sessions";
import { ValidationError } from "@/modules/booking/errors";

export interface RegisterAccountInput {
  idNumber: string;
  fullName: string;
  phone: string;
  birthYear: number;
  password: string;
  country?: "VE" | "CO";
  now?: Date;
}

/** La cédula es la credencial de acceso, por eso debe ser única y normalizada. */
export async function registerAccount(
  input: RegisterAccountInput,
): Promise<{ accountId: string }> {
  const ahora = input.now ?? new Date();
  const idNumber = normalizeIdNumber(input.idNumber);
  const phone = normalizePhone(input.phone, input.country ?? "VE");

  if (!isValidIdNumber(idNumber)) {
    throw new ValidationError("La cédula no tiene un formato válido.");
  }
  if (input.fullName.trim().length < 3) {
    throw new ValidationError("Escribe tu nombre completo.");
  }
  if (!isValidPhone(phone)) {
    throw new ValidationError("El número de teléfono no es válido.");
  }
  if (!isValidBirthYear(input.birthYear, ahora)) {
    throw new ValidationError("El año de nacimiento no es válido.");
  }
  if (input.password.length < 8) {
    throw new ValidationError("La contraseña debe tener al menos 8 caracteres.");
  }

  const passwordHash = await hashPassword(input.password);

  try {
    return await prisma.$transaction(async (tx) => {
      const cuenta = await tx.passengerAccount.create({
        data: {
          idNumber,
          fullName: input.fullName.trim(),
          phone,
          birthYear: input.birthYear,
          passwordHash,
        },
      });
      await writeAudit(tx, {
        actorType: "PASAJERO",
        actorAccountId: cuenta.id,
        entityType: "PassengerAccount",
        entityId: cuenta.id,
        action: "CUENTA_CREADA",
        after: { idNumber, fullName: cuenta.fullName },
      });
      return { accountId: cuenta.id };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ValidationError(
        `Ya existe una cuenta con la cédula ${idNumber}. Intenta ingresar en vez de registrarte.`,
      );
    }
    throw error;
  }
}

/** Devuelve el token de sesión si las credenciales son correctas. */
export async function loginAccount(
  idNumber: string,
  password: string,
  now: Date = new Date(),
): Promise<{ token: string; expiresAt: Date; accountId: string } | null> {
  const cuenta = await prisma.passengerAccount.findUnique({
    where: { idNumber: normalizeIdNumber(idNumber) },
  });
  if (!cuenta || !cuenta.active) return null;
  if (!(await verifyPassword(cuenta.passwordHash, password))) return null;

  const sesion = await createPassengerSession(cuenta.id, now);
  await prisma.passengerAccount.update({
    where: { id: cuenta.id },
    data: { lastLoginAt: now },
  });
  return { ...sesion, accountId: cuenta.id };
}
