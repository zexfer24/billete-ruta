import { IconChevronDown } from "@/components/icons";
import { SkeletonScreen } from "@/components/skeleton";
import { FieldPreview, PrimaryButtonPreview } from "../_publico/form-skeleton";
import { LOGIN_DESCRIPTION } from "../_publico/links";
import { PublicCard, PublicShell } from "../_publico/public-shell";
import { ID_NUMBER_HINT } from "../registro/texts";

/** Enlace de texto quieto, con las medidas de `PUBLIC_TEXT_LINK_CLASS`. */
const LINK_PREVIEW_CLASS =
  "inline-flex min-h-11 items-center px-1 font-semibold text-marca-700 underline decoration-marca-200 decoration-2 underline-offset-4";

/**
 * Silueta de ingresar (spec 6.5 y 2.2). La pantalla no consulta datos, así
 * que se pinta el formulario real quieto: el logo, el título, las etiquetas,
 * las ayudas, el texto del botón "Ingresar" y los enlaces. Los campos y el
 * botón llevan el brillo de carga, para que no parezcan listos antes de
 * tiempo. Solo el lector de pantalla oye el aviso de carga.
 */
export default function IngresarLoading() {
  return (
    <SkeletonScreen label="Cargando el ingreso…">
      <PublicShell>
        {/* Sin `next` (un loading.tsx no lo recibe), la frase es la de siempre. */}
        <PublicCard title="Ingresa a tu cuenta" description={LOGIN_DESCRIPTION}>
          <div aria-hidden="true" className="flex flex-col gap-5">
            <FieldPreview label="Cédula" hint={ID_NUMBER_HINT} />
            <FieldPreview label="Contraseña" password />
            <PrimaryButtonPreview>Ingresar</PrimaryButtonPreview>
            <p className="inline-flex min-h-11 items-center gap-1 px-1 font-semibold text-marca-700 underline decoration-marca-200 decoration-2 underline-offset-4">
              ¿Olvidaste tu contraseña?
              <IconChevronDown aria-hidden="true" className="size-5" />
            </p>
          </div>
        </PublicCard>
        <div aria-hidden="true" className="flex flex-col gap-2 text-center">
          <p className="text-base text-tinta-suave">
            ¿No tienes cuenta? <span className={LINK_PREVIEW_CLASS}>Crea tu cuenta</span>
          </p>
          <p className="text-base text-tinta-suave">
            ¿Te registraron en la taquilla? <span className={LINK_PREVIEW_CLASS}>Activa tu cuenta</span>
          </p>
        </div>
      </PublicShell>
    </SkeletonScreen>
  );
}
