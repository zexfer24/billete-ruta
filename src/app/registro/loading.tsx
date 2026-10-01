import type { ReactNode } from "react";
import { SkeletonScreen } from "@/components/skeleton";
import { FieldPreview, PrimaryButtonPreview } from "../_publico/form-skeleton";
import { PublicCard, PublicShell } from "../_publico/public-shell";
import {
  COUNTER_NOTICE_TEXT,
  REGISTER_DESCRIPTION,
  REGISTER_GROUPS,
  REGISTER_HINTS,
  REGISTER_TITLE,
} from "./texts";

/**
 * Silueta del registro (spec 6.5 y 2.2). La pantalla no consulta datos, así
 * que se pinta el formulario real quieto: el logo, el título, los tres
 * grupos con sus etiquetas y ayudas, los campos vacíos, el botón "Crear mi
 * cuenta" y, al pie, el enlace a ingresar y la nota de taquilla. Solo el
 * lector de pantalla oye el aviso de carga.
 */
export default function RegistroLoading() {
  return (
    <SkeletonScreen label="Cargando el registro…">
      <PublicShell>
        <PublicCard title={REGISTER_TITLE} description={REGISTER_DESCRIPTION}>
          <div aria-hidden="true" className="flex flex-col gap-6">
            <PreviewGroup title={REGISTER_GROUPS.datos}>
              <FieldPreview label="Cédula" hint={REGISTER_HINTS.idNumber} />
              <FieldPreview label="Nombres" hint={REGISTER_HINTS.givenNames} />
              <FieldPreview label="Apellidos" />
              <FieldPreview label="Año de nacimiento" hint={REGISTER_HINTS.birthYear} />
            </PreviewGroup>
            <PreviewGroup title={REGISTER_GROUPS.avisos} separated>
              <FieldPreview label="Teléfono" hint={REGISTER_HINTS.phone} />
            </PreviewGroup>
            <PreviewGroup title={REGISTER_GROUPS.acceso} separated>
              <FieldPreview label="Contraseña" hint={REGISTER_HINTS.password} password />
              <FieldPreview label="Repite la contraseña" hint={REGISTER_HINTS.confirmPassword} password />
            </PreviewGroup>
            <PrimaryButtonPreview>Crear mi cuenta</PrimaryButtonPreview>
          </div>
        </PublicCard>
        <div aria-hidden="true" className="flex flex-col gap-2 text-center">
          <p className="text-base text-tinta-suave">
            ¿Ya tienes cuenta?{" "}
            <span className="inline-flex min-h-11 items-center px-1 font-semibold text-marca-700 underline decoration-marca-200 decoration-2 underline-offset-4">
              Ingresa aquí
            </span>
          </p>
          <p className="text-sm leading-relaxed text-tinta-suave">{COUNTER_NOTICE_TEXT}</p>
        </div>
      </PublicShell>
    </SkeletonScreen>
  );
}

/** El mismo grupo de `RegisterForm`, con su título y su línea de separación. */
function PreviewGroup({
  title,
  separated = false,
  children,
}: {
  title: string;
  separated?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-4${separated ? " border-t border-borde pt-5" : ""}`}>
      <p className="text-lg font-semibold text-tinta">{title}</p>
      {children}
    </div>
  );
}
