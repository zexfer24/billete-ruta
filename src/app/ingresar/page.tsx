import type { Metadata } from "next";
import Link from "next/link";
import { safeNext } from "@/lib/safe-next";
import { buttonClass, Card } from "@/components/ui";
import { firstParam, registerHref } from "../_publico/links";
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

      <Card className="flex flex-col gap-3 text-center">
        <p className="text-base font-semibold text-tinta">
          ¿No tienes cuenta o te registraron en la taquilla?
        </p>
        <Link href={registerHref(next)} className={buttonClass("secundario", "w-full")}>
          Crear o activar mi cuenta
        </Link>
      </Card>
    </PublicShell>
  );
}
