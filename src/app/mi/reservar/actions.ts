"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createReservation, joinWaitlist } from "@/modules/booking";
import {
  DepartureClosedError,
  MissingDocumentsError,
  NoSeatsAvailableError,
  ValidationError,
} from "@/modules/booking/errors";
import { requirePassenger } from "@/modules/auth";

const companionSchema = z.object({
  fullName: z.string().min(1),
  idNumber: z.string().min(1),
  birthYear: z.coerce.number().int(),
});

const crearReservaSchema = z.object({
  departureId: z.string().min(1),
  paymentMethodId: z.string().min(1),
  policiesAccepted: z.string().refine((v) => v === "on" || v === "true"),
  companions: z.array(companionSchema).max(5),
});

export interface CrearReservaState {
  error: string | null;
}

export async function crearReservaAction(
  _prevState: CrearReservaState,
  formData: FormData,
): Promise<CrearReservaState> {
  const pasajero = await requirePassenger();

  let companions: unknown;
  try {
    companions = JSON.parse(String(formData.get("companions") ?? "[]"));
  } catch {
    return { error: "No se pudieron leer los datos de los acompañantes." };
  }

  const parsed = crearReservaSchema.safeParse({
    departureId: formData.get("departureId"),
    paymentMethodId: formData.get("paymentMethodId"),
    policiesAccepted: formData.get("policiesAccepted"),
    companions,
  });

  if (!parsed.success) {
    return { error: "Revisa los datos del formulario antes de continuar." };
  }

  try {
    const resultado = await createReservation({
      accountId: pasajero.id,
      departureId: parsed.data.departureId,
      paymentMethodId: parsed.data.paymentMethodId,
      companions: parsed.data.companions,
      policiesAccepted: true,
    });
    redirect(`/mi/reservas/${resultado.code}`);
  } catch (error) {
    if (
      error instanceof ValidationError ||
      error instanceof MissingDocumentsError ||
      error instanceof NoSeatsAvailableError ||
      error instanceof DepartureClosedError
    ) {
      return { error: error.message };
    }
    throw error;
  }
}

const waitlistSchema = z.object({
  departureId: z.string().min(1),
  passengerCount: z.coerce.number().int().min(1).max(6),
});

export interface WaitlistState {
  error: string | null;
  success: boolean;
}

export async function unirseListaEsperaAction(
  _prevState: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const pasajero = await requirePassenger();

  const parsed = waitlistSchema.safeParse({
    departureId: formData.get("departureId"),
    passengerCount: formData.get("passengerCount"),
  });
  if (!parsed.success) {
    return { error: "Datos inválidos para la lista de espera.", success: false };
  }

  try {
    await joinWaitlist({
      departureId: parsed.data.departureId,
      accountId: pasajero.id,
      passengerCount: parsed.data.passengerCount,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return { error: error.message, success: false };
    }
    throw error;
  }

  return { error: null, success: true };
}
