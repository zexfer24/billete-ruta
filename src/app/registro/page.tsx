import type { Metadata } from "next";
import Link from "next/link";
import { safeNext } from "@/lib/safe-next";
import { firstParam, loginHref, PUBLIC_TEXT_LINK_CLASS } from "../_publico/links";
import { PublicCard, PublicShell } from "../_publico/public-shell";
import { RegisterForm } from "./register-form";
import { COUNTER_NOTICE_TEXT, REGISTER_DESCRIPTION, REGISTER_TITLE } from "./texts";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  // Un `next` repetido, externo o mal formado se descarta: al terminar se va a
  // /mi/documentos si falta la foto de la cédula, o a /mi si ya está.
  const next = safeNext(firstParam((await searchParams).next)) ?? undefined;

  return (
    <PublicShell>
      <PublicCard title={REGISTER_TITLE} description={REGISTER_DESCRIPTION}>
        <RegisterForm next={next} />
      </PublicCard>

      <div className="flex flex-col gap-2 text-center">
        <p className="text-base text-tinta-suave">
          ¿Ya tienes cuenta?{" "}
          <Link href={loginHref(next)} className={PUBLIC_TEXT_LINK_CLASS}>
            Ingresa aquí
          </Link>
        </p>
        <p className="text-sm leading-relaxed text-tinta-suave">{COUNTER_NOTICE_TEXT}</p>
      </div>
    </PublicShell>
  );
}
