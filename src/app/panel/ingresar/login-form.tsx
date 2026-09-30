"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { Alert } from "@/components/alert";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/ui";
import { panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { IconEye, IconLock } from "@/components/icons";
import { loginAction, type PanelLoginState } from "./actions";

const initialState: PanelLoginState = {};

interface FieldErrors {
  email?: string;
  password?: string;
}

/**
 * Revisa los dos campos antes de enviar, con mensajes propios en español en
 * vez de la burbuja del navegador (cuyo idioma depende del equipo). Solo mira
 * que estén escritos y que el correo tenga forma de correo; si la cuenta
 * existe lo decide el servidor.
 */
function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  const correo = email.trim();
  if (!correo) errors.email = "Escribe tu correo electrónico.";
  else if (!/^[^\s@]+@[^\s@]+$/.test(correo)) errors.email = "Revisa el correo: debe tener la forma nombre@dominio.";
  if (!password) errors.password = "Escribe tu contraseña.";
  return errors;
}

/**
 * Formulario de acceso del personal: correo y contraseña con etiquetas
 * visibles, opción de ver la contraseña dentro del mismo campo, errores bajo
 * cada campo (spec 6.2), un error general claro que dice qué hacer y un botón
 * que muestra la espera mientras se comprueba el acceso.
 */
export function PanelLoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Tras un error del servidor, el foco va a la contraseña para corregirla sin buscarla.
  useEffect(() => {
    if (state.error) passwordRef.current?.focus();
  }, [state]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const errors = validate(emailRef.current?.value ?? "", passwordRef.current?.value ?? "");
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      event.preventDefault();
      (errors.email ? emailRef : passwordRef).current?.focus();
    }
  }

  /** Al corregir un campo, su error desaparece. */
  function clearError(field: keyof FieldErrors) {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  const emailInvalid = Boolean(fieldErrors.email || state.error);
  const passwordInvalid = Boolean(fieldErrors.password || state.error);

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {state.error ? (
        <Alert tone="peligro" title="No pudimos darte acceso">
          {state.error}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="panel-email" className="text-sm font-semibold text-tinta">
          Correo electrónico
        </label>
        <input
          ref={emailRef}
          id="panel-email"
          type="email"
          name="email"
          autoComplete="username"
          inputMode="email"
          spellCheck={false}
          defaultValue={state.email ?? ""}
          onChange={() => clearError("email")}
          aria-invalid={emailInvalid ? true : undefined}
          aria-describedby={fieldErrors.email ? "panel-email-error" : undefined}
          className={panelInputClass("min-h-12")}
        />
        {fieldErrors.email ? (
          <FieldError id="panel-email-error" afterSubmit>
            {fieldErrors.email}
          </FieldError>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="panel-password" className="text-sm font-semibold text-tinta">
          Contraseña
        </label>
        <div className="relative">
          <input
            ref={passwordRef}
            id="panel-password"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            onChange={() => clearError("password")}
            aria-invalid={passwordInvalid ? true : undefined}
            aria-describedby={fieldErrors.password ? "panel-password-error" : undefined}
            className={panelInputClass("min-h-12 w-full pr-28")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-pressed={showPassword}
            aria-controls="panel-password"
            aria-label={showPassword ? "Ocultar la contraseña" : "Mostrar la contraseña"}
            className={panelButtonClass(
              "fantasma",
              "sm",
              "absolute right-1 top-1/2 min-h-11 -translate-y-1/2 px-2.5",
            )}
          >
            <IconEye className="size-5" />
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        {fieldErrors.password ? (
          <FieldError id="panel-password-error" afterSubmit>
            {fieldErrors.password}
          </FieldError>
        ) : null}
      </div>

      <SubmitButton pendingLabel="Entrando…" className={panelButtonClass("primario", "lg", "min-h-14 w-full text-lg")}>
        <IconLock className="size-5" />
        Entrar al panel
      </SubmitButton>
    </form>
  );
}
