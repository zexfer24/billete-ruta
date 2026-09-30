import { Skeleton } from "@/components/skeleton";

/**
 * Piezas de carga de los formularios públicos: la misma medida que un `Field`
 * (etiqueta de 20 px y control de 48 px) y que el botón principal de 56 px.
 */
export function FieldSkeleton({ hint = false }: { hint?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-5 w-24 rounded-pastilla" />
      <Skeleton className="h-12 w-full" />
      {hint ? <Skeleton className="h-4 w-4/5 rounded-pastilla" /> : null}
    </div>
  );
}

export function PrimaryButtonSkeleton() {
  return <Skeleton className="h-14 w-full rounded-pastilla" />;
}
