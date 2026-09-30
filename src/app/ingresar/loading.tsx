import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { Card } from "@/components/ui";
import { FieldSkeleton, PrimaryButtonSkeleton } from "../_publico/form-skeleton";
import { PublicCard, PublicShell } from "../_publico/public-shell";

/**
 * Silueta de ingresar (spec 6.5 y 2.2): el logo, el título y la tarjeta se
 * pintan reales; los dos campos y el botón, como bloques de su misma medida.
 */
export default function IngresarLoading() {
  return (
    <SkeletonScreen label="Cargando el ingreso…">
      <PublicShell>
        <PublicCard title="Ingresa a tu cuenta" description="Usa tu cédula y tu contraseña.">
          <div aria-hidden="true" className="flex flex-col gap-5">
            <FieldSkeleton hint />
            <FieldSkeleton />
            <PrimaryButtonSkeleton />
            <Skeleton className="h-5 w-48 rounded-pastilla" />
          </div>
        </PublicCard>
        <Card className="flex flex-col items-center gap-3">
          <Skeleton className="h-5 w-4/5 rounded-pastilla" />
          <Skeleton className="h-12 w-full rounded-pastilla" />
        </Card>
      </PublicShell>
    </SkeletonScreen>
  );
}
