import type { Metadata } from "next";
import Link from "next/link";
import { safeNext } from "@/lib/safe-next";
import { firstParam, PUBLIC_TEXT_LINK_CLASS, registerHref } from "../_publico/links";
import { PublicCard, PublicShell } from "../_publico/public-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default async function IngresarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  // Un `next` repetido, externo o mal formado se descarta: se vuelve a /mi.
  const next = safeNext(firstParam((await searchParams).next)) ?? undefined;

  return (
    <PublicShell>
      <PublicCard title="Ingresa a tu cuenta" description="Usa tu cédula y tu contraseña.">
        <LoginForm next={next} />
      </PublicCard>

      {/* El mismo patrón que registro: una línea con enlace, que no compite con "Ingresar". */}
      <p className="text-center text-base text-tinta-suave">
        ¿No tienes cuenta o te registraron en la taquilla?{" "}
        <Link href={registerHref(next)} className={PUBLIC_TEXT_LINK_CLASS}>
          Crea o activa tu cuenta
        </Link>
      </p>
    </PublicShell>
  );
}
