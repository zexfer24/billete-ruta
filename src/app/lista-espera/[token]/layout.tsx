import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getActiveClaim } from "./claim";

/**
 * Valida el enlace antes del límite de carga de `loading.tsx`. El layout se
 * pinta fuera de ese límite, así que un enlace vencido, ya usado o inexistente
 * llama a `notFound()` antes de que se envíe nada y la respuesta sale con
 * estado 404. La pantalla la pinta `../not-found.tsx`, porque un
 * `notFound()` lanzado en un layout lo atiende el segmento padre.
 */
export default async function ListaEsperaTokenLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!(await getActiveClaim(token))) {
    notFound();
  }
  return children;
}
