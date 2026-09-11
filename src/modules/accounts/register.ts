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
  givenNames: string;
  surnames: string;
  phone: string;
  birthYear: number;
  password: string;
  country?: "VE" | "CO";
  now?: Date;
}

/** Recorta los espacios de los extremos y colapsa los espacios internos. */
function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** La cédula es la credencial de acceso, por eso debe ser única y normalizada. */
export async function registerAccount(
  input: RegisterAccountInput,
): Promise<{ accountId: string }> {
  const ahora = input.now ?? new Date();
  const idNumber = normalizeIdNumber(input.idNumber);
  const phone = normalizePhone(input.phone, input.country ?? "VE");
  const givenNames = normalizeSpaces(input.givenNames);
  const surnames = normalizeSpaces(input.surnames);

  if (!isValidIdNumber(idNumber)) {
    throw new ValidationError("La cédula no tiene un formato válido.");
  }
  if (givenNames.length < 2) {
    throw new ValidationError("Escribe tus nombres.");
  }
  if (surnames.length < 2) {
    throw new ValidationError("Escribe tus apellidos.");
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
  const fullName = `${givenNames} ${surnames}`;

  try {
    return await prisma.$transaction(async (tx) => {
      const cuenta = await tx.passengerAccount.create({
        data: {
          idNumber,
          givenNames,
          surnames,
          fullName,
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
        after: {
          idNumber,
          givenNames: cuenta.givenNames,
          surnames: cuenta.surnames,
          fullName: cuenta.fullName,
        },
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
