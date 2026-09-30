import type { ReactNode } from "react";

/**
 * Tarjeta centrada del acceso del personal (spec 2.2 y 7): el logo morado
 * arriba, el título y para quién es, y debajo el contenido. La comparten la
 * página y su silueta de carga, para que nada salte al terminar de cargar.
 */
export function LoginCard({ logo, children }: { logo: ReactNode; children: ReactNode }) {
  return (
    <main id="contenido" className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-tarjeta border border-borde bg-superficie p-6 shadow-1 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          {logo}
          <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Acceso del personal</h1>
          <p className="text-base leading-relaxed text-tinta-suave">
            Para operadores de agencia y administradores del terminal.
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
