import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { FieldSkeleton, PrimaryButtonSkeleton } from "../_publico/form-skeleton";
import { PublicCard, PublicShell } from "../_publico/public-shell";

/**
 * Silueta del registro (spec 6.5 y 2.2): el logo, el título y la tarjeta se
 * pintan reales; el aviso de taquilla, los tres grupos de campos (4, 1 y 2) y
 * el botón, como bloques de su misma medida.
 */
export default function RegistroLoading() {
  return (
    <SkeletonScreen label="Cargando el registro…">
      <PublicShell>
        <PublicCard
          title="Crea tu cuenta"
          description="Con tu cuenta reservas tus pasajes, pagas y guardas tus tickets."
        >
          <div aria-hidden="true" className="flex flex-col gap-6">
            <Skeleton className="h-28 w-full" />
            {[4, 1, 2].map((campos, grupo) => (
              <div key={grupo} className="flex flex-col gap-4">
                <Skeleton className="h-5 w-32 rounded-pastilla" />
                {Array.from({ length: campos }, (_, indice) => (
                  <FieldSkeleton key={indice} hint={indice === 0} />
                ))}
              </div>
            ))}
            <PrimaryButtonSkeleton />
          </div>
        </PublicCard>
      </PublicShell>
    </SkeletonScreen>
  );
}
