import { IconChevronDown } from "@/components/icons";
import { SkeletonScreen } from "@/components/skeleton";
import { FieldPreview, PrimaryButtonPreview } from "../_publico/form-skeleton";
import { PublicCard, PublicShell } from "../_publico/public-shell";

/**
 * Silueta de ingresar (spec 6.5 y 2.2). La pantalla no consulta datos, así
 * que se pinta el formulario real quieto: el logo, el título, las etiquetas,
 * las ayudas, el botón "Ingresar" y los enlaces, con los campos vacíos. Solo
 * el lector de pantalla oye el aviso de carga.
 */
export default function IngresarLoading() {
  return (
    <SkeletonScreen label="Cargando el ingreso…">
      <PublicShell>
        <PublicCard title="Ingresa a tu cuenta" description="Usa tu cédula y tu contraseña.">
          <div aria-hidden="true" className="flex flex-col gap-5">
            <FieldPreview label="Cédula" hint="La letra y el número, por ejemplo V12345678. Con o sin puntos." />
            <FieldPreview label="Contraseña" password />
            <PrimaryButtonPreview>Ingresar</PrimaryButtonPreview>
            <p className="inline-flex min-h-11 items-center gap-1 px-1 font-semibold text-marca-700 underline decoration-marca-200 decoration-2 underline-offset-4">
              ¿Olvidaste tu contraseña?
              <IconChevronDown aria-hidden="true" className="size-5" />
            </p>
          </div>
        </PublicCard>
        <p aria-hidden="true" className="text-center text-base text-tinta-suave">
          ¿No tienes cuenta o te registraron en la taquilla?{" "}
          <span className="inline-flex min-h-11 items-center px-1 font-semibold text-marca-700 underline decoration-marca-200 decoration-2 underline-offset-4">
            Crea o activa tu cuenta
          </span>
        </p>
      </PublicShell>
    </SkeletonScreen>
  );
}
