import type { Metadata } from "next";
import Link from "next/link";
import { safeNext } from "@/lib/safe-next";
import { Alert } from "@/components/alert";
import { firstParam, loginHref, PUBLIC_TEXT_LINK_CLASS } from "../_publico/links";
import { PublicCard, PublicShell } from "../_publico/public-shell";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  // Un `next` repetido, externo o mal formado se descarta: al terminar se va a /mi.
  const next = safeNext(firstParam((await searchParams).next)) ?? undefined;

  return (
    <PublicShell>
      <PublicCard
        title="Crea tu cuenta"
        description="Con tu cuenta reservas tus pasajes, pagas y guardas tus tickets."
      >
        <Alert tone="info" role="none" title="¿Te registraron en la taquilla?">
          Llena este mismo formulario con la cédula, el teléfono y el año de nacimiento que diste
          allí. No se crea otra cuenta: se activa la tuya y eliges tu contraseña.
        </Alert>
        <RegisterForm next={next} />
      </PublicCard>

      <p className="text-center text-base text-tinta-suave">
        ¿Ya tienes cuenta?{" "}
        <Link href={loginHref(next)} className={PUBLIC_TEXT_LINK_CLASS}>
          Ingresa aquí
        </Link>
      </p>
    </PublicShell>
  );
}
