"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { Alert } from "@/components/alert";
import { IconChevronDown } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, Field } from "@/components/ui";
import { PUBLIC_TEXT_LINK_CLASS, registerHref } from "../_publico/links";
import { PasswordField } from "../_publico/password-field";
import { useFocusFirstError } from "../_publico/use-focus-first-error";
import { ingresarAction, type IngresarFormState } from "./actions";

const initialState: IngresarFormState = { error: null };

/**
 * Formulario de ingreso: cédula y contraseña, con la ruta de retorno en un
 * campo oculto. Los errores de un campo aparecen junto a él y el foco va al
 * primero; los errores generales van arriba, con el camino para quien fue
 * registrado en la taquilla y todavía no tiene contraseña.
 */
export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(ingresarAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.attempt);

  const errores = state.fieldErrors ?? {};

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next ?? ""} />

      {state.error ? (
        <Alert
          key={state.attempt}
          tone="peligro"
          title="No pudimos ingresar"
          action={
            state.errorKind === "no-coinciden" ? (
              <Link href={registerHref(next)} className={buttonClass("secundario", undefined, "sm")}>
                Activar mi cuenta
              </Link>
            ) : undefined
          }
        >
          <p>{state.error}</p>
          {state.errorKind === "no-coinciden" ? (
            <p className="mt-1 text-sm text-tinta-suave">
              Si te registraron en la taquilla, primero activa tu cuenta y elige tu contraseña.
            </p>
          ) : null}
        </Alert>
      ) : null}

      <Field
        label="Cédula"
        name="idNumber"
        inputMode="text"
        autoComplete="username"
        autoCapitalize="characters"
        hint="La letra y el número, por ejemplo V12345678. Con o sin puntos."
        defaultValue={state.idNumber ?? ""}
        error={errores.idNumber}
        errorAfterSubmit
        required
      />
      <PasswordField
        label="Contraseña"
        name="password"
        autoComplete="current-password"
        error={errores.password}
        errorAfterSubmit
        required
      />

      <SubmitButton pendingLabel="Ingresando…" className={buttonClass("primario", "w-full", "lg")}>
        Ingresar
      </SubmitButton>

      <details className="group">
        <summary
          className={`${PUBLIC_TEXT_LINK_CLASS} cursor-pointer list-none gap-1 [&::-webkit-details-marker]:hidden`}
        >
          ¿Olvidaste tu contraseña?
          <IconChevronDown
            aria-hidden="true"
            className="size-5 transition-transform duration-150 ease-out group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <p className="mt-1 text-sm leading-relaxed text-tinta-suave">
          Acércate con tu cédula a la taquilla de tu agencia en el terminal y pide ayuda para
          recuperar el acceso a tu cuenta.
        </p>
      </details>
    </form>
  );
}
