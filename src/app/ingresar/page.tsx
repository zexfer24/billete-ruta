import { AppHeader } from "@/components/app-header";
import { LoginForm } from "./login-form";

export default async function IngresarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="min-h-screen bg-lienzo">
      <AppHeader
        compact
        title="Ingresar"
        subtitle="Accede con tu cédula y tu contraseña"
        back="/"
      />
      <main className="mx-auto max-w-md px-4 py-6">
        <LoginForm next={next} />
      </main>
    </div>
  );
}
