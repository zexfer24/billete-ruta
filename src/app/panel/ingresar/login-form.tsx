"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

const initialState: { error?: string } = {};

export function PanelLoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-6 py-16">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-texto-suave)]">
          Panel del personal
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Ingresar</h1>
        <p className="mt-2 text-sm text-[var(--color-texto-suave)]">
          Acceso exclusivo para personal de agencia y administración del terminal.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Correo electrónico
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Contraseña
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-base"
          />
        </label>

        {state.error ? (
          <p className="text-sm font-medium text-[var(--color-peligro)]">{state.error}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--color-acento)] px-5 py-3 font-medium text-white disabled:opacity-60"
        >
          {pending ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
