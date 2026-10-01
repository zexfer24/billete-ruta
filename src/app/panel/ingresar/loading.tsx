import { SkeletonScreen } from "@/components/skeleton";
import { panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { IconEye, IconLock } from "@/components/icons";
import { LoginCard, StaffLoginFooter } from "./login-card";

/**
 * Silueta del acceso del personal (spec 6.5). La pantalla no consulta datos:
 * el logo, el título, las etiquetas, los campos vacíos, el botón y el pie son
 * fijos y se pintan reales desde el primer instante, con las mismas medidas
 * del panel que usa `login-form.tsx` (no las del pasajero), para que nada
 * cambie de forma al terminar de cargar. Todo va quieto: sin foco ni enlaces.
 */
export default function IngresarPanelLoading() {
  return (
    <SkeletonScreen label="Cargando el acceso…">
      <LoginCard footer={<StaffLoginFooter still />}>
        <div aria-hidden="true" className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-tinta">Correo electrónico</span>
            <span className={panelInputClass("block min-h-12")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-tinta">Contraseña</span>
            <span className="relative block">
              <span className={panelInputClass("block min-h-12 w-full pr-28")} />
              <span
                className={panelButtonClass("fantasma", "sm", "absolute right-1 top-1/2 min-h-11 -translate-y-1/2 px-2.5")}
              >
                <IconEye className="size-5" />
                Mostrar
              </span>
            </span>
          </div>
          <span className={panelButtonClass("primario", "lg", "min-h-14 w-full text-lg")}>
            <IconLock className="size-5" />
            Entrar al panel
          </span>
        </div>
      </LoginCard>
    </SkeletonScreen>
  );
}
