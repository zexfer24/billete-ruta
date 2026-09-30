import type { ReactNode } from "react";
import { TableShell } from "@/components/panel-ui";

/**
 * Tabla en pantallas anchas y tarjetas en las demás, para las listas del
 * panel de agencia (tablero y "Pasajeros y pagos"). A diferencia de la opción
 * `mobile` de `TableShell` (que cambia en `md`), aquí la tabla aparece desde
 * `xl`: con la barra lateral de 272 px, entre `md` y `lg` estas tablas no
 * caben sin desplazarse de lado, y en la tableta del mostrador se leen mejor
 * las tarjetas, en dos columnas desde `md`.
 */
export function ResponsiveTable({ table, cards }: { table: ReactNode; cards: ReactNode }) {
  return (
    <>
      <div className="hidden xl:block">
        <TableShell>{table}</TableShell>
      </div>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">{cards}</ul>
    </>
  );
}
