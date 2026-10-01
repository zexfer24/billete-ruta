import type { ReactNode } from "react";
import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { Card } from "@/components/ui";
import { FieldPreview, PrimaryButtonSkeleton } from "../_publico/form-skeleton";
import { PublicShell } from "../_publico/public-shell";
import { REGISTER_GROUPS, REGISTER_HINTS } from "./texts";

/**
 * Silueta del registro (spec 6.5 y 2.2). La pantalla no consulta datos, así
 * que se pinta el formulario real quieto: el logo, los tres grupos con sus
 * etiquetas y ayudas, y los campos con el brillo de carga. El título, la frase, el texto del
 * botón y el pie dependen de `?modo=` ("Crea tu cuenta" o "Activa tu
 * cuenta"), que un `loading.tsx` no recibe: van como barras, para que la
 * carga nunca diga una cosa y la pantalla otra. Solo el lector de pantalla
 * oye el aviso de carga.
 */
export default function RegistroLoading() {
  return (
    <SkeletonScreen label="Cargando el registro…">
      <PublicShell>
        <Card className="flex flex-col gap-5 sm:p-6">
          <div aria-hidden="true" className="flex flex-col gap-2">
            <Skeleton className="h-8 w-3/5 rounded-pastilla" />
            <div className="flex flex-col gap-2.5 py-1">
              <Skeleton className="h-4 w-full rounded-pastilla" />
              <Skeleton className="h-4 w-3/5 rounded-pastilla" />
            </div>
          </div>
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
            <PrimaryButtonSkeleton />
          </div>
        </Card>
        <div aria-hidden="true" className="flex flex-col items-center gap-2">
          <div className="flex min-h-11 w-full items-center justify-center">
            <Skeleton className="h-4 w-3/5 rounded-pastilla" />
          </div>
          <div className="flex min-h-11 w-full items-center justify-center">
            <Skeleton className="h-4 w-4/5 rounded-pastilla" />
          </div>
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
