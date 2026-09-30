import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

/** Página 404 de marca (spec 6.6): qué pasó, qué hacer y un solo botón. */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-tarjeta border border-borde bg-superficie p-8 text-center shadow-1">
        <Logo tone="marca" className="mx-auto h-24 w-auto" />
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-tinta sm:text-3xl">
          No encontramos esta página
        </h1>
        <p className="mt-3 text-base leading-relaxed text-tinta-suave">
          Puede que el enlace esté incompleto o que la página ya no exista. Desde el inicio
          puedes buscar tu viaje o entrar a tu cuenta.
        </p>
        <Link
          href="/"
          className="foco mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-pastilla bg-marca-600 px-6 text-base font-semibold text-white transition-colors duration-150 ease-out hover:bg-marca-700 motion-reduce:transition-none"
        >
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
