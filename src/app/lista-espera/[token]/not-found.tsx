import type { Metadata } from "next";
import { currentPassenger } from "@/modules/auth";
import { InactiveLink } from "./inactive-link";

export const metadata: Metadata = {
  title: "Enlace no activo",
  robots: { index: false, follow: false },
};

/**
 * Enlace de lista de espera que no existe, venció o ya se usó. La página
 * llama a `notFound()`, así que responde con estado de error como la 404
 * general, pero conserva la pantalla de marca con los caminos a seguir.
 */
export default async function ListaEsperaNoActiva() {
  const pasajero = await currentPassenger();
  return <InactiveLink loggedIn={pasajero !== null} />;
}
