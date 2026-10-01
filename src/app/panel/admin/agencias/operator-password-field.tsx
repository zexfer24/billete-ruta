"use client";

import { useState } from "react";
import { IconEye } from "@/components/icons";
import { PANEL_LABEL_CLASS, panelButtonClass, panelInputClass } from "@/components/panel-ui";

/**
 * Contraseña inicial del primer operador, con "Mostrar" / "Ocultar". El
 * administrador la inventa y se la entrega en persona, y el panel no tiene
 * cómo cambiarla después: tiene que poder revisar lo que escribió antes de
 * registrar. Mismo patrón que la contraseña de `/panel/ingresar`: el texto
 * visible dice la acción y el lector de pantalla oye además "contraseña", sin
 * un `aria-pressed` que lo contradiga. No usa `PasswordField` de `_publico`,
 * que lleva el estilo de la app del pasajero.
 */
export function OperatorPasswordField({ label, name, hint }: { label: string; name: string; hint: string }) {
  const [visible, setVisible] = useState(false);
  const hintId = `${name}-ayuda`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className={PANEL_LABEL_CLASS}>
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          required
          minLength={8}
          autoComplete="new-password"
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby={hintId}
          className={panelInputClass("pr-28")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-controls={name}
          className={panelButtonClass("fantasma", "sm", "absolute right-1 top-1/2 min-h-11 -translate-y-1/2 px-2.5")}
        >
          <IconEye className="size-5" />
          {visible ? "Ocultar" : "Mostrar"}
          <span className="sr-only"> contraseña</span>
        </button>
      </div>
      <p id={hintId} className="text-sm leading-snug text-tinta-suave">
        {hint}
      </p>
    </div>
  );
}
