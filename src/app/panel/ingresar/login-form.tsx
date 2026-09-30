"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/alert";
import { SubmitButton } from "@/components/submit-button";
import { panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { IconEye, IconLock } from "@/components/icons";
import { loginAction, type PanelLoginState } from "./actions";

const initialState: PanelLoginState = {};

/**
 * Formulario de acceso del personal: correo y contraseña con etiquetas
 * visibles, opción de ver la contraseña, un error claro que dice qué hacer y
 * un botón que muestra la espera mientras se comprueba el acceso.
 */
export function PanelLoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Tras un error, el foco va a la contraseña para corregirla sin buscarla.
  useEffect(() => {
    if (state.error) passwordRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
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
          id="panel-email"
          type="email"
          name="email"
          required
          autoComplete="username"
          inputMode="email"
          spellCheck={false}
          defaultValue={state.email ?? ""}
          aria-invalid={state.error ? true : undefined}
          className={panelInputClass("min-h-12")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="panel-password" className="text-sm font-semibold text-tinta">
          Contraseña
        </label>
        <div className="flex gap-2">
          <input
            ref={passwordRef}
            id="panel-password"
            type={showPassword ? "text" : "password"}
            name="password"
            required
            autoComplete="current-password"
            aria-invalid={state.error ? true : undefined}
            className={panelInputClass("min-h-12 flex-1")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-pressed={showPassword}
            aria-controls="panel-password"
            className={panelButtonClass("secundario", "lg", "min-h-12 shrink-0")}
          >
            <IconEye className="size-5" />
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>

      <SubmitButton pendingLabel="Entrando…" className={panelButtonClass("primario", "lg", "min-h-14 w-full text-lg")}>
        <IconLock className="size-5" />
        Entrar al panel
      </SubmitButton>
    </form>
  );
}
