import type { ReactNode } from "react";
import { requirePanelUser } from "@/modules/auth";

/**
 * Guarda del panel del terminal: solo deja pasar a quien tiene el permiso
 * `terminal.dashboard`. El marco (barra lateral en variante `terminal`,
 * contenido y pie) lo pinta `panel/layout.tsx` en la rama del administrador,
 * para que la silueta de `panel/loading.tsx`, que envuelve este layout, ya
 * aparezca dentro de ese marco mientras se resuelve la guarda.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requirePanelUser("terminal.dashboard");
  return <>{children}</>;
}
