import type { Metadata } from "next";
import Link from "next/link";
import { safeNext } from "@/lib/safe-next";
import { firstParam, PUBLIC_TEXT_LINK_CLASS, registerHref } from "../_publico/links";
import { activateHref } from "../registro/texts";
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

      {/*
        El mismo patrón que registro: líneas con enlace, que no compiten con
        "Ingresar". Crear y activar son dos casos distintos, cada uno con su
        enlace, para que quien fue registrado en la taquilla llegue a una
        pantalla que dice "Activa tu cuenta".
      */}
      <div className="flex flex-col gap-2 text-center">
        <p className="text-base text-tinta-suave">
          ¿No tienes cuenta?{" "}
          <Link href={registerHref(next)} className={PUBLIC_TEXT_LINK_CLASS}>
            Crea tu cuenta
          </Link>
        </p>
        <p className="text-base text-tinta-suave">
          ¿Te registraron en la taquilla?{" "}
          <Link href={activateHref(next)} className={PUBLIC_TEXT_LINK_CLASS}>
            Activa tu cuenta
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}
