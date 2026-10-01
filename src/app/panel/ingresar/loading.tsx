import { SkeletonScreen } from "@/components/skeleton";
import { FieldPreview } from "@/app/_publico/form-skeleton";
import { IconLock } from "@/components/icons";
import { LoginCard, StaffLoginFooter } from "./login-card";

/**
 * Botón principal quieto del panel (56 px, `rounded-control` como
 * `panelButtonClass("primario", "lg")` de `login-form.tsx`): el texto real
 * sobre el brillo de carga, sin el relleno morado, para que se lea qué hará
 * sin parecer listo para pulsarse. No se reutiliza `PrimaryButtonPreview` del
 * pasajero porque es una pastilla y la forma cambiaría al llegar la página.
 */
function PanelPrimaryButtonPreview() {
  return (
    <span className="esqueleto flex min-h-14 w-full items-center justify-center gap-2 rounded-control px-6 text-lg font-semibold text-marca-700">
      <IconLock className="size-5" />
      Entrar al panel
    </span>
  );
}

/**
 * Silueta del acceso del personal (spec 6.5). La pantalla no consulta datos:
 * el logo, el título, las etiquetas, el texto del botón y el pie se pintan
 * reales desde el primer instante. Los campos y el botón, en cambio, llevan
 * el brillo de carga y no el borde de control ni el relleno morado, con la
 * misma convención que `/ingresar` y `/registro` (`FieldPreview`): así nadie
 * empieza a escribir en un campo que todavía no responde. Las medidas son las
 * del panel (campos de 48 px y botón de 56 px con `rounded-control`), para
 * que nada cambie de forma al terminar de cargar. Todo va quieto.
 */
export default function IngresarPanelLoading() {
  return (
    <SkeletonScreen label="Cargando el acceso…">
      <LoginCard footer={<StaffLoginFooter still />}>
        <div aria-hidden="true" className="flex flex-col gap-5">
          <FieldPreview label="Correo electrónico" />
          <FieldPreview label="Contraseña" password />
          <PanelPrimaryButtonPreview />
        </div>
      </LoginCard>
    </SkeletonScreen>
  );
}
