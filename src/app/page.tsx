import Link from "next/link";

export default function PortadaPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-texto-suave)]">
          Terminal de pasajeros
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">TicketRuta</h1>
        <p className="mt-4 max-w-xl text-lg text-[var(--color-texto-suave)]">
          Reserva tu puesto, paga con comprobante y recibe tu ticket digital con código de
          verificación.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/mi/reservar"
          className="rounded-lg bg-[var(--color-acento)] px-5 py-3 font-medium text-white"
        >
          Reservar un puesto
        </Link>
        <Link
          href="/ingresar"
          className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-5 py-3 font-medium"
        >
          Ingresar con mi cédula
        </Link>
        <Link
          href="/panel/ingresar"
          className="rounded-lg px-5 py-3 font-medium text-[var(--color-texto-suave)]"
        >
          Acceso del personal
        </Link>
      </div>
    </main>
  );
}
