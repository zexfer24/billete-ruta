"use client";

import Link from "next/link";
import { useActionState, useId, useRef, type ReactNode } from "react";
import { Alert } from "@/components/alert";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, Field } from "@/components/ui";
import { loginHref } from "../_publico/links";
import { PasswordField } from "../_publico/password-field";
import { useFocusFirstError } from "../_publico/use-focus-first-error";
import { registrarAction, type RegistroFormState } from "./actions";
import { REGISTER_GROUPS, REGISTER_HINTS } from "./texts";

const initialState: RegistroFormState = { error: null };

/**
 * Formulario de registro (o de activación de una cuenta creada en taquilla),
 * en tres grupos con título: tus datos, cómo te avisamos y tu acceso. Cada
 * error aparece junto a su campo, en lugar de su ayuda, y el foco va al
 * primero; lo escrito se conserva tras un error, salvo las contraseñas.
 */
export function RegisterForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(registrarAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.attempt);

  const errores = state.fieldErrors ?? {};
  const valores = state.values ?? {};
  // Con error, el error reemplaza a la ayuda: cada mensaje ya dice qué
  // escribir, y ayuda más error juntos repetían lo mismo con otras palabras.
  const hintFor = (campo: keyof typeof REGISTER_HINTS) => (errores[campo] ? undefined : REGISTER_HINTS[campo]);

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

      <FieldGroup title={REGISTER_GROUPS.datos}>
        <Field
          label="Cédula"
          name="idNumber"
          inputMode="text"
          autoComplete="username"
          autoCapitalize="characters"
          hint={hintFor("idNumber")}
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
          hint={hintFor("givenNames")}
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
          hint={hintFor("birthYear")}
          defaultValue={valores.birthYear ?? ""}
          error={errores.birthYear}
          errorAfterSubmit
          required
        />
      </FieldGroup>

      <FieldGroup title={REGISTER_GROUPS.avisos} separated>
        <Field
          label="Teléfono"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          hint={hintFor("phone")}
          defaultValue={valores.phone ?? ""}
          error={errores.phone}
          errorAfterSubmit
          required
        />
      </FieldGroup>

      <FieldGroup title={REGISTER_GROUPS.acceso} separated>
        <PasswordField
          label="Contraseña"
          name="password"
          autoComplete="new-password"
          hint={hintFor("password")}
          error={errores.password}
          errorAfterSubmit
          required
          minLength={8}
        />
        <PasswordField
          label="Repite la contraseña"
          name="confirmPassword"
          autoComplete="new-password"
          hint={hintFor("confirmPassword")}
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

/**
 * Grupo de campos con título visible, para que el formulario no sea una sola
 * pared. El título es un `h2` (se distingue de las etiquetas de los campos y
 * se puede recorrer por encabezados) que además nombra el grupo; a partir del
 * segundo grupo, una línea lo separa del anterior. Es un `role="group"` y no
 * un `fieldset` para que la leyenda no se monte sobre esa línea.
 */
function FieldGroup({
  title,
  separated = false,
  children,
}: {
  title: string;
  separated?: boolean;
  children: ReactNode;
}) {
  const titleId = useId();

  return (
    <div
      role="group"
      aria-labelledby={titleId}
      className={`flex min-w-0 flex-col gap-4${separated ? " border-t border-borde pt-5" : ""}`}
    >
      <h2 id={titleId} className="text-lg font-semibold text-tinta">
        {title}
      </h2>
      {children}
    </div>
  );
}
