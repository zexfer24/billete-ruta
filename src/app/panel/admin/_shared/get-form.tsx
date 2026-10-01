"use client";

import Form from "next/form";
import { useSearchParams } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { IconSpinner } from "@/components/icons";

/**
 * Formulario de filtros (GET) del administrador y su botón con espera.
 *
 * Usa `next/form`: enviar navega del lado del cliente, sin recargar el
 * documento, y la zona de datos muestra su silueta (`<Suspense>` con clave).
 * Con una acción de texto `next/form` navega con `router.push` y no con una
 * acción de React, así que `useFormStatus` (y por eso `SubmitButton`) nunca
 * ve el envío como pendiente. Aquí la espera se lleva a mano: empieza al
 * enviar y termina cuando la URL deja de ser la de antes del envío. Si lo
 * enviado es igual a lo que ya está en la URL no hay navegación ni espera.
 */

const PendingContext = createContext(false);

/** Tope de la espera, por si la navegación no llega a cambiar la URL. */
const MAX_PENDING_MS = 15_000;

function queryOf(form: HTMLFormElement): string {
  const params = new URLSearchParams();
  new FormData(form).forEach((value, name) => {
    if (typeof value === "string") params.append(name, value);
  });
  return params.toString();
}

export function GetForm({
  action,
  className,
  role,
  children,
}: {
  action: string;
  className?: string;
  role?: string;
  children: ReactNode;
}) {
  const current = useSearchParams().toString();
  const [submittedFrom, setSubmittedFrom] = useState<string | null>(null);
  // Llegó otra URL: la espera terminó. Se limpia al renderizar (no en un
  // efecto) para que volver atrás a la URL de antes no la reviva.
  if (submittedFrom !== null && submittedFrom !== current) setSubmittedFrom(null);
  const pending = submittedFrom !== null && submittedFrom === current;

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setSubmittedFrom(null), MAX_PENDING_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (pending) {
      event.preventDefault();
      return;
    }
    setSubmittedFrom(queryOf(event.currentTarget) === current ? null : current);
  }

  return (
    <PendingContext.Provider value={pending}>
      <Form action={action} className={className} role={role} onSubmit={onSubmit}>
        {children}
      </Form>
    </PendingContext.Provider>
  );
}

/** Botón de envío de `GetForm`: mientras navega, indicador giratorio y `pendingLabel`. */
export function GetSubmitButton({
  children,
  pendingLabel = "Buscando…",
  className,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const pending = useContext(PendingContext);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (pending) event.preventDefault();
  }

  return (
    <>
      <button type="submit" className={className} aria-disabled={pending ? true : undefined} onClick={handleClick}>
        {pending ? (
          <>
            <IconSpinner className="size-5 shrink-0 animate-spin motion-reduce:animate-none" />
            <span>{pendingLabel}</span>
          </>
        ) : (
          children
        )}
      </button>
      <span className="sr-only" role="status">
        {pending ? pendingLabel : ""}
      </span>
    </>
  );
}
