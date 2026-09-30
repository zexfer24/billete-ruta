/**
 * Borrador del asistente de reserva en `sessionStorage` (solo esta pestaña
 * del navegador). Guarda lo que la persona ya eligió para que no lo pierda si
 * sale a Documentos a subir la cédula, recarga la página o vuelve más tarde
 * en la misma pestaña. Es una comodidad: si el almacenamiento no está
 * disponible, el asistente funciona igual desde cero. Se borra al crear la
 * reserva, al empezar de nuevo y a las dos horas.
 *
 * El borrador lleva el id de la cuenta que lo escribió: si en la misma
 * pestaña ingresa otra persona (un equipo compartido), no se le restauran
 * los acompañantes ni las condiciones aceptadas de la anterior, y el
 * borrador ajeno se borra.
 */

export const BOOKING_DRAFT_KEY = "ticketruta:reserva-en-curso";

/** Un borrador más viejo que esto ya no sirve: el cupo y los precios pudieron cambiar. */
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

export interface BookingDraftCompanion {
  fullName: string;
  idNumber: string;
  birthYear: string;
}

export interface BookingDraft {
  version: 2;
  /** Cuenta del pasajero que escribió el borrador. */
  accountId: string;
  savedAt: number;
  step: 1 | 2 | 3 | 4;
  departureId: string;
  companions: BookingDraftCompanion[];
  policiesAccepted: boolean;
  paymentMethodId: string | null;
}

function isCompanion(value: unknown): value is BookingDraftCompanion {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.fullName === "string" &&
    typeof record.idNumber === "string" &&
    typeof record.birthYear === "string"
  );
}

/**
 * Valida un borrador leído del navegador; cualquier cosa rara se descarta,
 * igual que el borrador de otra cuenta.
 */
export function parseBookingDraft(raw: string | null, now: number, accountId: string): BookingDraft | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const draft = value as Record<string, unknown>;
  if (draft.version !== 2) return null;
  if (typeof draft.accountId !== "string" || draft.accountId === "" || draft.accountId !== accountId) {
    return null;
  }
  if (typeof draft.savedAt !== "number" || now - draft.savedAt > MAX_AGE_MS || draft.savedAt > now + 60_000) {
    return null;
  }
  if (draft.step !== 1 && draft.step !== 2 && draft.step !== 3 && draft.step !== 4) return null;
  if (typeof draft.departureId !== "string" || draft.departureId === "") return null;
  if (!Array.isArray(draft.companions) || draft.companions.length > 5 || !draft.companions.every(isCompanion)) {
    return null;
  }
  if (typeof draft.policiesAccepted !== "boolean") return null;
  if (draft.paymentMethodId !== null && typeof draft.paymentMethodId !== "string") return null;
  return {
    version: 2,
    accountId: draft.accountId,
    savedAt: draft.savedAt,
    step: draft.step,
    departureId: draft.departureId,
    companions: draft.companions,
    policiesAccepted: draft.policiesAccepted,
    paymentMethodId: draft.paymentMethodId,
  };
}

/** Lee el borrador de esta cuenta. Si el guardado no sirve o es de otra cuenta, lo borra. */
export function readBookingDraft(accountId: string): BookingDraft | null {
  try {
    const raw = window.sessionStorage.getItem(BOOKING_DRAFT_KEY);
    const draft = parseBookingDraft(raw, Date.now(), accountId);
    if (!draft && raw !== null) window.sessionStorage.removeItem(BOOKING_DRAFT_KEY);
    return draft;
  } catch {
    return null;
  }
}

export function writeBookingDraft(draft: Omit<BookingDraft, "version" | "savedAt">): void {
  try {
    window.sessionStorage.setItem(
      BOOKING_DRAFT_KEY,
      JSON.stringify({ version: 2, savedAt: Date.now(), ...draft } satisfies BookingDraft),
    );
  } catch {
    // Sin almacenamiento (ventana privada, sitio bloqueado): el asistente sigue sin borrador.
  }
}

export function clearBookingDraft(): void {
  try {
    window.sessionStorage.removeItem(BOOKING_DRAFT_KEY);
  } catch {
    // Nada que limpiar si el almacenamiento no está disponible.
  }
}
