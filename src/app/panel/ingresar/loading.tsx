import { Logo } from "@/components/logo";
import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { LoginCard } from "./login-card";

/**
 * Silueta del acceso del personal (spec 6.5): la tarjeta con el logo y el
 * título reales desde el primer instante, y los dos campos y el botón como
 * bloques de carga.
 */
export default function IngresarPanelLoading() {
  return (
    <SkeletonScreen label="Cargando el acceso…">
      <LoginCard logo={<Logo tone="marca" priority className="h-24 w-auto" />}>
        <div aria-hidden="true" className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-36 rounded-pastilla" />
            <Skeleton className="h-12 w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-24 rounded-pastilla" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-5 w-3/4 rounded-pastilla" />
        </div>
      </LoginCard>
    </SkeletonScreen>
  );
}
