import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { ForbiddenError, requireAgencyUser } from "@/modules/auth";
import { getManifest } from "@/modules/catalog";
import { availableTripActions } from "@/modules/trips";
import { durationMinutes, formatCaracasDateTime24, formatDuration } from "@/lib/time";
import { PanelFeedback } from "@/components/panel-feedback";
import { registerArrivalAction, registerDepartureAction, startBoardingAction } from "../actions";

/** Traduce el código corto de `?ok=` a un texto. Un código desconocido no muestra nada. */
const OK_LABELS: Record<string, string> = {
  embarque: "Embarque iniciado.",
  salida: "Salida registrada.",
  llegada: "Llegada registrada.",
};

export default async function ManifiestoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { agencyId } = await requireAgencyUser("trips.manage");
  const { id } = await params;
  const { error, ok } = await searchParams;

  const salida = await getManifest(id, agencyId).catch((error: unknown) => {
    if (error instanceof ForbiddenError) notFound();
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      notFound();
    }
    throw error;
  });

  const duracion =
    salida.tripLog?.departedAt && salida.tripLog?.arrivedAt
      ? formatDuration(durationMinutes(salida.tripLog.departedAt, salida.tripLog.arrivedAt))
      : null;

  const acciones = availableTripActions({
    status: salida.status,
    boardingStartedAt: salida.tripLog?.boardingStartedAt ?? null,
    departedAt: salida.tripLog?.departedAt ?? null,
    arrivedAt: salida.tripLog?.arrivedAt ?? null,
  });
  const sinAcciones =
    !acciones.startBoarding && !acciones.registerDeparture && !acciones.registerArrival;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {salida.route.name} · {formatCaracasDateTime24(salida.departsAt)}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
          {salida.vehicle.plate} · {salida.driver.fullName} · Estado: {salida.status}
        </p>
        <Link
          href={`/panel/abordaje/${salida.id}`}
          className="mt-2 inline-block text-sm text-[var(--color-acento)] underline"
        >
          Ir a la pantalla de abordaje
        </Link>
      </div>

      <PanelFeedback error={error} ok={ok ? OK_LABELS[ok] : undefined} />

      <section className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5">
        <h2 className="text-lg font-semibold">Recorrido</h2>
        <dl className="tabular mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <dt className="text-[var(--color-texto-suave)]">Inicio de embarque</dt>
          <dd>
            {salida.tripLog?.boardingStartedAt
              ? formatCaracasDateTime24(salida.tripLog.boardingStartedAt)
              : "—"}
          </dd>
          <dt className="text-[var(--color-texto-suave)]">Salida</dt>
          <dd>{salida.tripLog?.departedAt ? formatCaracasDateTime24(salida.tripLog.departedAt) : "—"}</dd>
          <dt className="text-[var(--color-texto-suave)]">Llegada</dt>
          <dd>{salida.tripLog?.arrivedAt ? formatCaracasDateTime24(salida.tripLog.arrivedAt) : "—"}</dd>
          <dt className="text-[var(--color-texto-suave)]">Duración</dt>
          <dd>{duracion ?? "—"}</dd>
        </dl>

        <div className="mt-5 flex flex-wrap gap-3">
          {acciones.startBoarding ? (
            <details>
              <summary className="inline-block cursor-pointer rounded-lg bg-[var(--color-acento)] px-4 py-2 text-sm font-medium text-white">
                Iniciar embarque
              </summary>
              <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-borde)] p-3 text-sm">
                <p>¿Confirmas iniciar el embarque de esta salida?</p>
                <form action={startBoardingAction}>
                  <input type="hidden" name="departureId" value={salida.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-[var(--color-exito)] px-3 py-1.5 font-medium text-white"
                  >
                    Sí, iniciar
                  </button>
                </form>
              </div>
            </details>
          ) : null}

          {acciones.registerDeparture ? (
            <details>
              <summary className="inline-block cursor-pointer rounded-lg bg-[var(--color-acento)] px-4 py-2 text-sm font-medium text-white">
                Registrar salida
              </summary>
              <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-borde)] p-3 text-sm">
                <p>¿Confirmas registrar la salida? Las reservas sin abordaje quedarán sin efecto.</p>
                <form action={registerDepartureAction}>
                  <input type="hidden" name="departureId" value={salida.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-[var(--color-exito)] px-3 py-1.5 font-medium text-white"
                  >
                    Sí, registrar salida
                  </button>
                </form>
              </div>
            </details>
          ) : null}

          {acciones.registerArrival ? (
            <details>
              <summary className="inline-block cursor-pointer rounded-lg bg-[var(--color-acento)] px-4 py-2 text-sm font-medium text-white">
                Registrar llegada
              </summary>
              <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-borde)] p-3 text-sm">
                <p>¿Confirmas registrar la llegada de la unidad?</p>
                <form action={registerArrivalAction}>
                  <input type="hidden" name="departureId" value={salida.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-[var(--color-exito)] px-3 py-1.5 font-medium text-white"
                  >
                    Sí, registrar llegada
                  </button>
                </form>
              </div>
            </details>
          ) : null}

          {sinAcciones ? (
            <p className="text-sm text-[var(--color-texto-suave)]">
              {salida.status === "CANCELADA" ? "Salida cancelada." : "Recorrido cerrado."}
            </p>
          ) : null}
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-[var(--color-borde)] text-[var(--color-texto-suave)]">
            <tr>
              <th className="px-4 py-3 font-medium">Serial</th>
              <th className="px-4 py-3 font-medium">Pasajero</th>
              <th className="px-4 py-3 font-medium">Cédula</th>
              <th className="px-4 py-3 font-medium">Estado de la reserva</th>
              <th className="px-4 py-3 font-medium">Abordó</th>
            </tr>
          </thead>
          <tbody>
            {salida.reservations.flatMap((r) =>
              r.passengers.map((p) => (
                <tr key={p.id} className="border-b border-[var(--color-borde)] last:border-0">
                  <td className="tabular px-4 py-3">{r.code}</td>
                  <td className="px-4 py-3">
                    {p.fullName}
                    {p.isHolder ? " (titular)" : ""}
                  </td>
                  <td className="tabular px-4 py-3">{p.idNumber}</td>
                  <td className="px-4 py-3">{r.status}</td>
                  <td className="tabular px-4 py-3">
                    {p.boardedAt ? formatCaracasDateTime24(p.boardedAt) : "No"}
                  </td>
                </tr>
              )),
            )}
            {salida.reservations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-texto-suave)]">
                  Esta salida no tiene reservas.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
