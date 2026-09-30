import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPanelUser } from "@/modules/auth";
import { Logo } from "@/components/logo";
import { PanelLoginForm } from "./login-form";
import { LoginCard } from "./login-card";

export const metadata = { title: "Acceso del personal" };

/**
 * Acceso del personal (operadores de agencia y administración del terminal).
 * Quien ya tiene sesión abierta no ve el formulario: se le lleva directo a su
 * panel. Antes esta pantalla se dibujaba dentro de la barra lateral de la
 * sesión anterior y parecía que la aplicación estaba rota.
 */
export default async function IngresarPanelPage() {
  const user = await currentPanelUser();
  if (user) {
    redirect(user.role === "ADMIN" ? "/panel/admin/tablero" : "/panel");
  }
  return (
    <LoginCard logo={<Logo tone="marca" priority className="h-24 w-auto" />}>
      <PanelLoginForm />
      <p className="border-t border-borde pt-4 text-[15px] leading-relaxed text-tinta-suave">
        ¿No puedes entrar? Pide ayuda al administrador del terminal.
      </p>
      <p className="text-[15px] text-tinta-suave">
        ¿Eres pasajero?{" "}
        <Link href="/ingresar" className="foco rounded-sm font-semibold text-marca-700 underline underline-offset-2">
          Entra por aquí
        </Link>
      </p>
    </LoginCard>
  );
}
