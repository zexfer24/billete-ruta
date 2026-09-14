"use client";

import Link from "next/link";
import { useActionState } from "react";
import { buttonClass, Card, Field } from "@/components/ui";
import { registrarAction, type RegistroFormState } from "./actions";

const initialState: RegistroFormState = { error: null };

const ANIO_ACTUAL = new Date().getFullYear();

/** Formulario de registro de cuenta de pasajero. */
export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registrarAction, initialState);

  return (
    <Card>
      <form action={formAction} className="flex flex-col gap-4">
        <Field
          label="Cédula"
          name="idNumber"
          inputMode="text"
          autoComplete="username"
          autoCapitalize="characters"
          placeholder="V12345678"
          required
        />
        <Field label="Nombres" name="givenNames" autoComplete="given-name" required />
        <Field label="Apellidos" name="surnames" autoComplete="family-name" required />
        <Field
          label="Teléfono"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0412-1234567"
          hint="Con el código de área, por ejemplo 0412-1234567"
          required
        />
        <Field
          label="Año de nacimiento"
          name="birthYear"
          type="number"
          inputMode="numeric"
          min={1900}
          max={ANIO_ACTUAL}
          required
        />
        <Field
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="Mínimo 8 caracteres"
          required
          minLength={8}
        />
        <Field
          label="Confirmar contraseña"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />

        {state.error ? (
          <p role="alert" className="text-sm font-medium text-peligro">
            {state.error}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className={buttonClass("primario", "w-full")}>
          {pending ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-tinta-suave">
        ¿Ya tienes cuenta?{" "}
        <Link href="/ingresar" className="font-semibold text-marca">
          Ingresa aquí
        </Link>
      </p>
    </Card>
  );
}
