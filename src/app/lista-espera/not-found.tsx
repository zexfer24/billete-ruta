import type { Metadata } from "next";
import { currentPassenger } from "@/modules/auth";
import { InactiveLink } from "./[token]/inactive-link";

export const metadata: Metadata = {
  title: "Enlace no activo",
  robots: { index: false, follow: false },
};

/**
 * Enlace de lista de espera que no existe, venció o ya se usó. El layout de
 * `[token]` lo detecta antes del límite de carga y llama a `notFound()`, así
 * que la respuesta sale con estado 404 como la general, pero con la pantalla
 * de marca y los caminos a seguir. Vive en el segmento padre porque un
 * `notFound()` lanzado en un layout lo atiende el `not-found` de arriba.
 */
export default async function ListaEsperaNoActiva() {
  const pasajero = await currentPassenger();
  return <InactiveLink loggedIn={pasajero !== null} />;
}
