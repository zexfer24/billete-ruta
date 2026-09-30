"use client";

import { useEffect } from "react";
import { clearBookingDraft } from "../reservar/draft";

/** Borra el borrador del asistente de reserva al llegar a la reserva recién creada. */
export function ClearBookingDraft() {
  useEffect(() => {
    clearBookingDraft();
  }, []);
  return null;
}
