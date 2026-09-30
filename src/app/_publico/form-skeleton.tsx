import type { ReactNode } from "react";
import { IconEye } from "@/components/icons";
import { Skeleton } from "@/components/skeleton";
import { buttonClass } from "@/components/ui";
import { fieldControlClass } from "@/components/ui-classes";

/**
 * Formularios públicos quietos, para los `loading.tsx` de ingresar y
 * registro (spec 6.5): esas pantallas no consultan datos, así que su
 * silueta es el formulario real sin controles. Las etiquetas, las ayudas y
 * el texto del botón se pintan reales y los campos vacíos con su borde, con
 * las mismas medidas que `Field`, `PasswordField` y el botón `lg`; así la
 * pantalla no cambia de forma cuando llega. Van dentro de una zona
 * `aria-hidden`: el lector de pantalla oye el aviso de carga.
 */
export function FieldPreview({
  label,
  hint,
  password = false,
}: {
  label: string;
  hint?: string;
  /** Muestra el botón "Mostrar" dentro del campo, como `PasswordField`. */
  password?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-tinta">{label}</span>
      <div className={fieldControlClass(false, "relative block bg-superficie")}>
        {password ? (
          <span className="absolute right-0.5 top-1/2 inline-flex min-h-11 -translate-y-1/2 items-center gap-1.5 px-3 text-sm font-semibold text-marca-700">
            <IconEye aria-hidden="true" className="size-5" />
            Mostrar
          </span>
        ) : null}
      </div>
      {hint ? <p className="text-sm leading-snug text-tinta-suave">{hint}</p> : null}
    </div>
  );
}

/** Botón principal quieto, con su texto real. */
export function PrimaryButtonPreview({ children }: { children: ReactNode }) {
  return <span className={buttonClass("primario", "w-full", "lg")}>{children}</span>;
}

/**
 * Bloque de carga del botón principal (56 px), para las pantallas cuyo botón
 * depende de datos (la lista de espera).
 */
export function PrimaryButtonSkeleton() {
  return <Skeleton className="h-14 w-full rounded-pastilla" />;
}
