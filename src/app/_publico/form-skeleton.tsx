import type { ReactNode } from "react";
import { Skeleton } from "@/components/skeleton";

/**
 * Formularios públicos quietos, para los `loading.tsx` de ingresar y
 * registro (spec 6.5): esas pantallas no consultan datos, así que su
 * silueta es el formulario real sin controles. Las etiquetas, las ayudas y
 * el texto del botón se pintan reales, con las mismas medidas que `Field`,
 * `PasswordField` y el botón `lg`, para que la pantalla no cambie de forma
 * cuando llega. Los campos y el botón, en cambio, llevan el brillo de
 * `.esqueleto` y no el borde de control ni el relleno morado: así nadie toca
 * un campo que todavía no abre el teclado ni pulsa un botón que todavía no
 * responde creyendo que la app falló. Van dentro de una zona `aria-hidden`:
 * el lector de pantalla oye el aviso de carga.
 */
export function FieldPreview({
  label,
  hint,
  password = false,
}: {
  label: string;
  hint?: string;
  /** Reserva el lugar del botón "Mostrar" dentro del campo, como `PasswordField`. */
  password?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-tinta">{label}</span>
      <div className="esqueleto block min-h-12 rounded-control">
        {password ? (
          <span className="absolute right-3 top-1/2 h-4 w-20 -translate-y-1/2 rounded-pastilla bg-marca-100" />
        ) : null}
      </div>
      {hint ? <p className="text-sm leading-snug text-tinta-suave">{hint}</p> : null}
    </div>
  );
}

/**
 * Botón principal quieto (56 px), con su texto real sobre el brillo de carga
 * en vez del relleno morado: se lee qué hará, pero no parece listo para
 * tocarse.
 */
export function PrimaryButtonPreview({ children }: { children: ReactNode }) {
  return (
    <span className="esqueleto flex min-h-14 w-full items-center justify-center rounded-pastilla px-6 text-lg font-semibold text-marca-700">
      {children}
    </span>
  );
}

/**
 * Bloque de carga del botón principal (56 px), para las pantallas cuyo botón
 * depende de datos (la lista de espera).
 */
export function PrimaryButtonSkeleton() {
  return <Skeleton className="h-14 w-full rounded-pastilla" />;
}
