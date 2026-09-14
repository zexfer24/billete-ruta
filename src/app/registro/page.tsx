import { AppHeader } from "@/components/app-header";
import { RegisterForm } from "./register-form";

export default function RegistroPage() {
  return (
    <div className="min-h-screen bg-lienzo">
      <AppHeader
        compact
        title="Crear cuenta"
        subtitle="Usa tu cédula para reservar y gestionar tus pasajes"
        back="/ingresar"
      />
      <main className="mx-auto max-w-md px-4 py-6">
        <RegisterForm />
      </main>
    </div>
  );
}
