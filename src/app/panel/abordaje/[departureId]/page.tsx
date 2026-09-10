import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { AbordajeScanner } from "./scanner";

export default async function AbordajePage({
  params,
}: {
  params: Promise<{ departureId: string }>;
}) {
  const user = await requirePanelUser("boarding.manage");
  requireAgencyScope(user);
  const { departureId } = await params;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-2 py-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Abordaje</h1>
        <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
          Escribe el serial o escanea el código QR del ticket.
        </p>
      </div>
      <AbordajeScanner departureId={departureId} />
    </div>
  );
}
