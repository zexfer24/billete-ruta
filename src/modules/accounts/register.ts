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

export interface CreateCounterAccountInput {
  idNumber: string;
  givenNames: string;
  surnames: string;
  phone: string;
  birthYear: number;
  panelUserId: string;
  country?: "VE" | "CO";
  now?: Date;
}

interface DatosValidados {
  idNumber: string;
  givenNames: string;
  surnames: string;
  phone: string;
  birthYear: number;
  fullName: string;
}

/** Recorta los espacios de los extremos y colapsa los espacios internos. */
function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Valida y normaliza cédula, nombres, apellidos, teléfono y año de nacimiento.
 * La reutilizan `registerAccount` y `createCounterAccount` para no duplicar
 * las reglas ni los mensajes de error.
 */
function validarDatosDeCuenta(input: {
  idNumber: string;
  givenNames: string;
  surnames: string;
  phone: string;
  birthYear: number;
  country?: "VE" | "CO";
  now?: Date;
}): DatosValidados {
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

  return { idNumber, givenNames, surnames, phone, birthYear: input.birthYear, fullName: `${givenNames} ${surnames}` };
}

/** La cédula es la credencial de acceso, por eso debe ser única y normalizada. */
export async function registerAccount(
  input: RegisterAccountInput,
): Promise<{ accountId: string }> {
  const datos = validarDatosDeCuenta(input);

  if (input.password.length < 8) {
    throw new ValidationError("La contraseña debe tener al menos 8 caracteres.");
  }

  const existente = await prisma.passengerAccount.findUnique({ where: { idNumber: datos.idNumber } });

  if (existente && existente.passwordHash !== null) {
    throw new ValidationError(
      `Ya existe una cuenta con la cédula ${datos.idNumber}. Intenta ingresar en vez de registrarte.`,
    );
  }

  const passwordHash = await hashPassword(input.password);

  if (existente) {
    // Cuenta creada en la taquilla, todavía sin contraseña: se activa solo si
    // los datos que aporta el pasajero coinciden con los que registró el operador.
    if (existente.phone !== datos.phone || existente.birthYear !== datos.birthYear) {
      throw new ValidationError(
        "Esta cédula tiene una cuenta creada en taquilla y los datos no coinciden. Acércate a la taquilla de tu agencia.",
      );
    }

    return prisma.$transaction(async (tx) => {
      await tx.passengerAccount.update({
        where: { id: existente.id },
        data: { passwordHash },
      });
      await writeAudit(tx, {
        actorType: "PASAJERO",
        actorAccountId: existente.id,
        entityType: "PassengerAccount",
        entityId: existente.id,
        action: "CUENTA_ACTIVADA",
        after: { idNumber: datos.idNumber },
      });
      return { accountId: existente.id };
    });
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const cuenta = await tx.passengerAccount.create({
        data: {
          idNumber: datos.idNumber,
          givenNames: datos.givenNames,
          surnames: datos.surnames,
          fullName: datos.fullName,
          phone: datos.phone,
          birthYear: datos.birthYear,
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
          idNumber: datos.idNumber,
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
        `Ya existe una cuenta con la cédula ${datos.idNumber}. Intenta ingresar en vez de registrarte.`,
      );
    }
    throw error;
  }
}

/**
 * Crea, desde la taquilla, una cuenta de pasajero sin contraseña. El
 * pasajero la activa después desde `/registro` con la misma cédula,
 * teléfono y año de nacimiento.
 *
 * No captura `P2002`: el llamador busca la cédula antes de invocar esta
 * función, y si de todos modos hay una carrera, el error dentro de la
 * transacción la aborta igual, así que no hace falta traducirlo aquí.
 */
export async function createCounterAccount(
  tx: Prisma.TransactionClient,
  input: CreateCounterAccountInput,
): Promise<{ accountId: string }> {
  const datos = validarDatosDeCuenta(input);

  const cuenta = await tx.passengerAccount.create({
    data: {
      idNumber: datos.idNumber,
      givenNames: datos.givenNames,
      surnames: datos.surnames,
      fullName: datos.fullName,
      phone: datos.phone,
      birthYear: datos.birthYear,
      passwordHash: null,
      createdByPanelUserId: input.panelUserId,
    },
  });
  await writeAudit(tx, {
    actorType: "PANEL",
    actorPanelUserId: input.panelUserId,
    entityType: "PassengerAccount",
    entityId: cuenta.id,
    action: "CUENTA_CREADA_EN_TAQUILLA",
    after: {
      idNumber: datos.idNumber,
      givenNames: cuenta.givenNames,
      surnames: cuenta.surnames,
      fullName: cuenta.fullName,
    },
  });
  return { accountId: cuenta.id };
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
  if (cuenta.passwordHash === null) return null;
  if (!(await verifyPassword(cuenta.passwordHash, password))) return null;

  const sesion = await createPassengerSession(cuenta.id, now);
  await prisma.passengerAccount.update({
    where: { id: cuenta.id },
    data: { lastLoginAt: now },
  });
  return { ...sesion, accountId: cuenta.id };
}
