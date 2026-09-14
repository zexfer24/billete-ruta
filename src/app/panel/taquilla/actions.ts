"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Currency } from "@prisma/client";
import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { ValidationError } from "@/modules/booking";
import {
  lookupCounterHolder,
  quoteCounterSale,
  sellAtCounter,
  type CounterHolderLookup,
  type CounterUpload,
} from "@/modules/counter";
import { getManifest } from "@/modules/catalog";
import { renderQrDataUrl } from "@/modules/tickets";
import { MAX_IMAGE_BYTES } from "@/lib/storage";
import { userFacingMessage } from "../feedback";

/**
 * Busca al titular por cédula antes de vender. El `agencyId` sale siempre de
 * la sesión: nunca se acepta el que pudiera venir del formulario.
 */
export async function lookupHolderAction(
  idNumber: string,
): Promise<{ ok: true; result: CounterHolderLookup } | { ok: false; error: string }> {
  const user = await requirePanelUser("sales.counter");
  const agencyId = requireAgencyScope(user);

  try {
    const result = await lookupCounterHolder(idNumber, { id: user.id, agencyId });
    return { ok: true, result };
  } catch (error) {
    const mensaje = userFacingMessage(error);
    if (mensaje === null) throw error;
    return { ok: false, error: mensaje };
  }
}

const quoteSchema = z.object({
  departureId: z.string().uuid("Selecciona una salida válida."),
  paymentMethodId: z.string().uuid("Selecciona un método de pago válido."),
  passengerCount: z
    .number({ invalid_type_error: "La cantidad de pasajeros debe ser un número." })
    .int("La cantidad de pasajeros debe ser un número entero.")
    .min(1, "La cantidad de pasajeros debe estar entre 1 y 6.")
    .max(6, "La cantidad de pasajeros debe estar entre 1 y 6."),
});

/** Cotiza el cobro del paso 4, sin crear nada todavía. */
export async function quoteSaleAction(input: {
  departureId: string;
  paymentMethodId: string;
  passengerCount: number;
}): Promise<
  | {
      ok: true;
      quote: {
        fareTotalUsd: string;
        taxTotalUsd: string;
        totalUsd: string;
        currency: Currency;
        amountInCurrency: string;
      };
    }
  | { ok: false; error: string }
> {
  const user = await requirePanelUser("sales.counter");
  const agencyId = requireAgencyScope(user);

  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    const quote = await quoteCounterSale({ agencyId, ...parsed.data });
    return { ok: true, quote };
  } catch (error) {
    const mensaje = userFacingMessage(error);
    if (mensaje === null) throw error;
    return { ok: false, error: mensaje };
  }
}

export type CounterSaleState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | {
      status: "success";
      sale: {
        code: string;
        totalUsd: string;
        amountCharged: string;
        currency: Currency;
        accountCreated: boolean;
        qrDataUrl: string;
        pdfPath: string;
        routeName: string;
        departsAt: string;
      };
    };

const companionSchema = z.object({
  fullName: z.string().min(1, "Cada acompañante necesita su nombre completo."),
  idNumber: z.string().min(1, "Cada acompañante necesita su cédula."),
  birthYear: z.coerce.number().int("El año de nacimiento de cada acompañante debe ser un número."),
});

const saleSchema = z.object({
  departureId: z.string().uuid("Selecciona una salida válida."),
  paymentMethodId: z.string().uuid("Selecciona un método de pago válido."),
  holderIdNumber: z.string().min(1, "Indica la cédula del titular."),
  holderGivenNames: z.string().optional(),
  holderSurnames: z.string().optional(),
  holderPhone: z.string().optional(),
  holderBirthYear: z.string().optional(),
  companions: z.array(companionSchema).max(5, "Puedes añadir hasta 5 acompañantes."),
  policiesAccepted: z
    .string()
    .refine((v) => v === "on", "El pasajero debe aceptar las políticas de viaje."),
});

/** Lee un archivo opcional del `FormData`. Un archivo de tamaño cero se trata como ausente, no como error. */
async function readOptionalUpload(
  formData: FormData,
  key: string,
): Promise<CounterUpload | undefined> {
  const archivo = formData.get(key);
  if (!(archivo instanceof File) || archivo.size === 0) return undefined;
  if (archivo.size > MAX_IMAGE_BYTES) {
    throw new ValidationError("La imagen no puede pesar más de 5 MB.");
  }
  const data = Buffer.from(await archivo.arrayBuffer());
  return { originalName: archivo.name, data };
}

/**
 * Venta completa en el mostrador: acción de `useActionState` del asistente de
 * taquilla. Todos los archivos y los datos compuestos (acompañantes) viajan
 * en el mismo `FormData` del único formulario del asistente.
 */
export async function sellAtCounterAction(
  _prevState: CounterSaleState,
  formData: FormData,
): Promise<CounterSaleState> {
  const user = await requirePanelUser("sales.counter");
  const agencyId = requireAgencyScope(user);

  let companions: unknown;
  try {
    companions = JSON.parse(String(formData.get("companions") ?? "[]"));
  } catch {
    return { status: "error", error: "No se pudieron leer los datos de los acompañantes." };
  }

  const parsed = saleSchema.safeParse({
    departureId: formData.get("departureId"),
    paymentMethodId: formData.get("paymentMethodId"),
    holderIdNumber: formData.get("holderIdNumber"),
    holderGivenNames: formData.get("holderGivenNames") || undefined,
    holderSurnames: formData.get("holderSurnames") || undefined,
    holderPhone: formData.get("holderPhone") || undefined,
    holderBirthYear: formData.get("holderBirthYear") || undefined,
    companions,
    policiesAccepted: formData.get("policiesAccepted"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario.",
    };
  }

  const holderBirthYear = parsed.data.holderBirthYear
    ? Number.parseInt(parsed.data.holderBirthYear, 10)
    : undefined;

  try {
    const cedula = await readOptionalUpload(formData, "cedula");
    const travelPermit = await readOptionalUpload(formData, "travelPermit");

    const resultado = await sellAtCounter({
      panelUserId: user.id,
      agencyId,
      departureId: parsed.data.departureId,
      paymentMethodId: parsed.data.paymentMethodId,
      holder: {
        idNumber: parsed.data.holderIdNumber,
        givenNames: parsed.data.holderGivenNames,
        surnames: parsed.data.holderSurnames,
        phone: parsed.data.holderPhone,
        birthYear: holderBirthYear,
      },
      companions: parsed.data.companions,
      documents: { cedula, travelPermit },
      policiesAccepted: true,
    });

    const qrDataUrl = await renderQrDataUrl(resultado.ticket.qrPayload);
    // `listCounterOptions` no sirve aquí: la salida ya puede haberse quedado
    // sin cupo con esta misma venta. El manifiesto siempre existe.
    const salida = await getManifest(parsed.data.departureId, agencyId);

    revalidatePath("/panel");
    revalidatePath("/panel/pasajeros");
    revalidatePath("/panel/salidas");

    return {
      status: "success",
      sale: {
        code: resultado.code,
        totalUsd: resultado.totalUsd,
        amountCharged: resultado.amountCharged,
        currency: resultado.currency,
        accountCreated: resultado.accountCreated,
        qrDataUrl,
        pdfPath: resultado.ticket.pdfPath,
        routeName: salida.route.name,
        departsAt: salida.departsAt.toISOString(),
      },
    };
  } catch (error) {
    const mensaje = userFacingMessage(error);
    if (mensaje === null) throw error;
    return { status: "error", error: mensaje };
  }
}
