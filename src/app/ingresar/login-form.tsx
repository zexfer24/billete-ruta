"use client";

import Link from "next/link";
import { useActionState } from "react";
import { buttonClass, Card, Field } from "@/components/ui";
import { ingresarAction, type IngresarFormState } from "./actions";

const initialState: IngresarFormState = { error: null };

/** Formulario de ingreso: cédula y contraseña, con la ruta de retorno en un campo oculto. */
export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(ingresarAction, initialState);

  return (
    <Card>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field
          label="Cédula"
          name="idNumber"
          inputMode="text"
          autoComplete="username"
          autoCapitalize="characters"
          placeholder="V12345678"
          required
          autoFocus
        />
        <Field
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />

        {state.error ? (
          <p role="alert" className="text-sm font-medium text-peligro">
            {state.error}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className={buttonClass("primario", "w-full")}>
          {pending ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-tinta-suave">
        ¿Todavía no tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-marca">
          Regístrate aquí
        </Link>
      </p>
    </Card>
  );
}
