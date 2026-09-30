"use client";

import Link from "next/link";
import { useActionState, useRef, type ReactNode } from "react";
import { Alert } from "@/components/alert";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, Field } from "@/components/ui";
import { loginHref } from "../_publico/links";
import { PasswordField } from "../_publico/password-field";
import { useFocusFirstError } from "../_publico/use-focus-first-error";
import { registrarAction, type RegistroFormState } from "./actions";

const initialState: RegistroFormState = { error: null };

/**
 * Formulario de registro (o de activación de una cuenta creada en taquilla),
 * en tres grupos con título: tus datos, tu teléfono y tu contraseña. Cada
 * error aparece junto a su campo y el foco va al primero; lo escrito se
 * conserva tras un error, salvo las contraseñas.
 */
export function RegisterForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(registrarAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.attempt);

  const errores = state.fieldErrors ?? {};
  const valores = state.values ?? {};

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="next" value={next ?? ""} />

      {state.error ? (
        <Alert
          key={state.attempt}
          tone="peligro"
          title="No pudimos crear tu cuenta"
          action={
            state.errorKind === "ir-a-ingresar" ? (
              <Link href={loginHref(next)} className={buttonClass("secundario", undefined, "sm")}>
                Ingresar
              </Link>
            ) : undefined
          }
        >
          {state.error}
        </Alert>
      ) : null}

      <FieldGroup title="Tus datos">
        <Field
          label="Cédula"
          name="idNumber"
          inputMode="text"
          autoComplete="username"
          autoCapitalize="characters"
          placeholder="V12345678"
          hint="La letra y el número, por ejemplo V12345678. Con o sin puntos."
          defaultValue={valores.idNumber ?? ""}
          error={errores.idNumber}
          errorAfterSubmit
          required
        />
        <Field
          label="Nombres"
          name="givenNames"
          autoComplete="given-name"
          autoCapitalize="words"
          hint="Como aparecen en tu cédula."
          defaultValue={valores.givenNames ?? ""}
          error={errores.givenNames}
          errorAfterSubmit
          required
        />
        <Field
          label="Apellidos"
          name="surnames"
          autoComplete="family-name"
          autoCapitalize="words"
          defaultValue={valores.surnames ?? ""}
          error={errores.surnames}
          errorAfterSubmit
          required
        />
        <Field
          label="Año de nacimiento"
          name="birthYear"
          inputMode="numeric"
          autoComplete="bday-year"
          pattern="[0-9]{4}"
          maxLength={4}
          placeholder="1990"
          hint="Solo el año, con cuatro números. Sirve para confirmar que eres tú."
          defaultValue={valores.birthYear ?? ""}
          error={errores.birthYear}
          errorAfterSubmit
          required
        />
      </FieldGroup>

      <FieldGroup title="Tu teléfono">
        <Field
          label="Teléfono"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0412-1234567"
          hint="Con el código de área, por ejemplo 0412-1234567. Te enviaremos aquí los avisos de tu viaje."
          defaultValue={valores.phone ?? ""}
          error={errores.phone}
          errorAfterSubmit
          required
        />
      </FieldGroup>

      <FieldGroup title="Tu contraseña">
        <PasswordField
          label="Contraseña"
          name="password"
          autoComplete="new-password"
          hint="Mínimo 8 caracteres. Elige una que puedas recordar."
          error={errores.password}
          errorAfterSubmit
          required
          minLength={8}
        />
        <PasswordField
          label="Repite la contraseña"
          name="confirmPassword"
          autoComplete="new-password"
          hint="Escríbela otra vez, para evitar errores."
          error={errores.confirmPassword}
          errorAfterSubmit
          required
          minLength={8}
        />
      </FieldGroup>

      <SubmitButton pendingLabel="Creando tu cuenta…" className={buttonClass("primario", "w-full", "lg")}>
        Crear mi cuenta
      </SubmitButton>
    </form>
  );
}

/** Grupo de campos con título visible, para que el formulario no sea una sola pared. */
function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4 border-0 p-0">
      <legend className="mb-3 text-base font-semibold text-tinta">{title}</legend>
      {children}
    </fieldset>
  );
}
