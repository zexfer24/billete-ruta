"use client";

import { useEffect, type RefObject } from "react";

/**
 * Tras cada respuesta del servidor (`trigger` cambia), lleva el foco al primer
 * campo marcado con error, para que la persona sepa por dónde empezar a
 * corregir. Si no hay campos con error no mueve el foco.
 */
export function useFocusFirstError(formRef: RefObject<HTMLFormElement | null>, trigger: unknown) {
  useEffect(() => {
    if (trigger === undefined) return;
    const campo = formRef.current?.querySelector('[aria-invalid="true"]');
    if (campo instanceof HTMLElement) campo.focus();
  }, [formRef, trigger]);
}
