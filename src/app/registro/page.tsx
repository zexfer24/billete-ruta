"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { useActionState } from "react";
import { registrarAction, type RegistroFormState } from "./actions";

const initialState: RegistroFormState = { error: null };

export default function RegistroPage() {
  const [state, formAction, pending] = useActionState(registrarAction, initialState);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-texto-suave)]">
          Terminal de pasajeros
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Crear cuenta</h1>
        <p className="mt-2 text-[var(--color-texto-suave)]">
          Usa tu cédula para reservar puestos y gestionar tus pasajes.
        </p>
      </div>

      <form
        action={formAction}
        className="flex flex-col gap-4 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-6"
      >
        <Campo label="Cédula" name="idNumber" placeholder="V12345678" required />
        <Campo label="Nombres" name="givenNames" required />
        <Campo label="Apellidos" name="surnames" required />
        <Campo label="Teléfono" name="phone" placeholder="0412-1234567" required />
        <Campo
          label="Año de nacimiento"
          name="birthYear"
          type="number"
          min={1900}
          max={2026}
          required
        />
        <Campo label="Contraseña" name="password" type="password" required minLength={8} />
        <Campo
          label="Confirmar contraseña"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
        />

        {state.error ? (
          <p className="text-sm text-[var(--color-peligro)]">{state.error}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--color-acento)] px-5 py-3 font-medium text-white disabled:opacity-60"
        >
          {pending ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <p className="text-sm text-[var(--color-texto-suave)]">
        ¿Ya tienes cuenta?{" "}
        <Link href="/ingresar" className="font-medium text-[var(--color-acento)]">
          Ingresa aquí
        </Link>
      </p>
    </main>
  );
}

function Campo({ label, ...rest }: ComponentPropsWithoutRef<"input"> & { label: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        {...rest}
        className="rounded-lg border border-[var(--color-borde)] px-3 py-2 text-base outline-none focus:border-[var(--color-acento)]"
      />
    </label>
  );
}
