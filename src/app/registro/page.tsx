import type { Metadata } from "next";
import Link from "next/link";
import { safeNext } from "@/lib/safe-next";
import { firstParam, loginHref, PUBLIC_TEXT_LINK_CLASS, registerHref } from "../_publico/links";
import { PublicCard, PublicShell } from "../_publico/public-shell";
import { parseRegisterMode } from "./mode";
import { RegisterForm } from "./register-form";
import { activateHref, REGISTER_TEXTS, registerDescription } from "./texts";

interface RegistroSearchParams {
  next?: string | string[];
  modo?: string | string[];
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RegistroSearchParams>;
}): Promise<Metadata> {
  return { title: REGISTER_TEXTS[parseRegisterMode((await searchParams).modo)].pageTitle };
}

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<RegistroSearchParams>;
}) {
  const params = await searchParams;
  // Un `next` repetido, externo o mal formado se descarta: al terminar se va a
  // /mi/documentos si falta la foto de la cédula, o a /mi si ya está.
  const next = safeNext(firstParam(params.next)) ?? undefined;
  // "activar" llega desde los enlaces de activación de /ingresar; cualquier
  // otro valor es la pantalla de crear cuenta.
  const mode = parseRegisterMode(params.modo);
  const textos = REGISTER_TEXTS[mode];

  return (
    <PublicShell>
      <PublicCard title={textos.title} description={registerDescription(mode, next)}>
        <RegisterForm next={next} mode={mode} />
      </PublicCard>

      {/*
        Dos líneas al pie en los dos modos, simétricas: el enlace a ingresar y
        el enlace al otro caso (crear o activar), conservando `next`.
      */}
      <div className="flex flex-col gap-2 text-center">
        <p className="text-base text-tinta-suave">
          {mode === "activar" ? "¿Ya elegiste tu contraseña?" : "¿Ya tienes cuenta?"}{" "}
          <Link href={loginHref(next)} className={PUBLIC_TEXT_LINK_CLASS}>
            Ingresa aquí
          </Link>
        </p>
        {mode === "activar" ? (
          <p className="text-base text-tinta-suave">
            ¿No te registraron en la taquilla?{" "}
            <Link href={registerHref(next)} className={PUBLIC_TEXT_LINK_CLASS}>
              Crea tu cuenta
            </Link>
          </p>
        ) : (
          <p className="text-base text-tinta-suave">
            ¿Te registraron en la taquilla?{" "}
            <Link href={activateHref(next)} className={PUBLIC_TEXT_LINK_CLASS}>
              Activa tu cuenta
            </Link>
          </p>
        )}
      </div>
    </PublicShell>
  );
}
