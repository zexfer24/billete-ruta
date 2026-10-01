import Link from "next/link";
import type { ReactNode } from "react";
import { PUBLIC_TEXT_LINK_CLASS } from "@/app/_publico/links";
import { PublicCard, PublicShell } from "@/app/_publico/public-shell";

/**
 * Estructura del acceso del personal (spec 2.2): la misma pieza que
 * `/ingresar` y `/registro`, con "Volver al inicio" arriba, el logo morado
 * sobre la tarjeta y el título alineado a la izquierda. La comparten la
 * página y su silueta de carga, para que nada salte al terminar de cargar.
 */
export function LoginCard({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  return (
    <PublicShell>
      <PublicCard
        title="Acceso del personal"
        // `block text-balance`: en escritorio el texto no deja una palabra sola
        // en la última línea.
        description={<span className="block text-balance">Para el personal de las agencias y del terminal.</span>}
      >
        {children}
      </PublicCard>
      {footer}
    </PublicShell>
  );
}

/**
 * Ayuda y enlace al acceso del pasajero, debajo de la tarjeta. Con `still`
 * (la silueta de carga) el enlace es un texto quieto que no recibe foco.
 */
export function StaffLoginFooter({ still = false }: { still?: boolean }) {
  return (
    <div className="flex flex-col gap-1 text-center text-base text-tinta-suave">
      {/* Vale para los dos perfiles: el administrador también entra por aquí. */}
      <p className="text-balance">
        ¿No puedes entrar? Pide ayuda a la administración del terminal o al responsable de tu agencia.
      </p>
      <p>
        ¿Eres pasajero?{" "}
        {still ? (
          <span className={PUBLIC_TEXT_LINK_CLASS}>Ingresa aquí</span>
        ) : (
          <Link href="/ingresar" className={PUBLIC_TEXT_LINK_CLASS}>
            Ingresa aquí
          </Link>
        )}
      </p>
    </div>
  );
}
