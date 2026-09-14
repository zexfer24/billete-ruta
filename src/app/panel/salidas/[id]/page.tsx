import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { ForbiddenError, requireAgencyUser } from "@/modules/auth";
import { getManifest } from "@/modules/catalog";
import { availableTripActions } from "@/modules/trips";
import { durationMinutes, formatCaracasDate, formatCaracasDateTime24, formatCaracasTime24, formatDuration } from "@/lib/time";
import { departureStatusLabel, departureStatusTone, reservationStatusLabel, reservationStatusTone } from "@/lib/labels";
import { PanelFeedback } from "@/components/panel-feedback";
import { IconCheck, IconQr } from "@/components/icons";
import { EmptyState, PanelPageHeader, SectionCard, StatusBadge, TableShell, panelButtonClass } from "@/components/panel-ui";
import { registerArrivalAction, registerDepartureAction, startBoardingAction } from "../actions";

/** Traduce el código corto de `?ok=` a un texto. Un código desconocido no muestra nada. */
const OK_LABELS: Record<string, string> = {
  embarque: "Embarque iniciado.",
  salida: "Salida registrada.",
  llegada: "Llegada registrada.",
};

/**
 * Hora de un paso del recorrido: solo "HH:mm" si ocurrió hoy (en Caracas);
 * con la fecha completa si no, para no dar a entender que fue hoy.
 */
function horaDelPaso(fecha: Date, ahora: Date): string {
  return formatCaracasDate(fecha) === formatCaracasDate(ahora)
    ? formatCaracasTime24(fecha)
    : formatCaracasDateTime24(fecha);
}

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

  const ahora = new Date();
  const boardingStartedAt = salida.tripLog?.boardingStartedAt ?? null;
  const departedAt = salida.tripLog?.departedAt ?? null;
  const arrivedAt = salida.tripLog?.arrivedAt ?? null;

  const duracion =
    departedAt && arrivedAt ? formatDuration(durationMinutes(departedAt, arrivedAt)) : null;

  const acciones = availableTripActions({
    status: salida.status,
    boardingStartedAt,
    departedAt,
    arrivedAt,
  });
  const sinAcciones =
    !acciones.startBoarding && !acciones.registerDeparture && !acciones.registerArrival;

  const puedeAbordar = salida.status === "MANIFIESTO_CERRADO" || salida.status === "EN_RUTA";

  const pasajerosTotal = salida.reservations.reduce((total, r) => total + r.passengers.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/panel/salidas" className={panelButtonClass("fantasma", "sm")}>
        ← Salidas
      </Link>

      <PanelPageHeader
        title={`${salida.route.name} · ${formatCaracasDateTime24(salida.departsAt)}`}
        description={`${salida.vehicle.plate} · ${salida.driver.fullName}`}
        actions={
          <>
            <StatusBadge label={departureStatusLabel(salida.status)} tone={departureStatusTone(salida.status)} />
            {puedeAbordar ? (
              <Link href={`/panel/abordaje/${salida.id}`} className={panelButtonClass("primario")}>
                <IconQr className="h-4 w-4" />
                Abrir abordaje
              </Link>
            ) : (
              <p className="text-sm text-[var(--color-texto-suave)]">
                El abordaje se habilita al iniciar el embarque
              </p>
            )}
          </>
        }
      />

      <PanelFeedback error={error} ok={ok ? OK_LABELS[ok] : undefined} />

      <SectionCard title="Recorrido">
        <ol className="flex flex-col gap-4">
          <PasoRecorrido
            numero={1}
            titulo="Iniciar embarque"
            hecho={boardingStartedAt}
            disponible={acciones.startBoarding}
            ahora={ahora}
          >
            {acciones.startBoarding ? (
              <ConfirmacionPaso
                variante="primario"
                resumen="Iniciar embarque"
                pregunta="¿Confirmas iniciar el embarque de esta salida?"
                textoBoton="Sí, iniciar"
                action={startBoardingAction}
                departureId={salida.id}
              />
            ) : null}
          </PasoRecorrido>

          <PasoRecorrido
            numero={2}
            titulo="Registrar salida"
            hecho={departedAt}
            disponible={acciones.registerDeparture}
            ahora={ahora}
          >
            {acciones.registerDeparture ? (
              <ConfirmacionPaso
                variante="peligro"
                resumen="Registrar salida"
                pregunta="¿Confirmas registrar la salida? Las reservas sin abordaje quedarán sin efecto."
                textoBoton="Sí, registrar salida"
                action={registerDepartureAction}
                departureId={salida.id}
              />
            ) : null}
          </PasoRecorrido>

          <PasoRecorrido
            numero={3}
            titulo="Registrar llegada"
            hecho={arrivedAt}
            disponible={acciones.registerArrival}
            ahora={ahora}
          >
            {acciones.registerArrival ? (
              <ConfirmacionPaso
                variante="primario"
                resumen="Registrar llegada"
                pregunta="¿Confirmas registrar la llegada de la unidad?"
                textoBoton="Sí, registrar llegada"
                action={registerArrivalAction}
                departureId={salida.id}
              />
            ) : null}
          </PasoRecorrido>
        </ol>

        {duracion ? (
          <p className="mt-4 text-sm text-[var(--color-texto-suave)]">
            Duración del recorrido: <span className="tabular">{duracion}</span>
          </p>
        ) : null}

        {sinAcciones ? (
          <p className="mt-4 text-sm text-[var(--color-texto-suave)]">
            {salida.status === "CANCELADA" ? "Salida cancelada." : "Recorrido cerrado."}
          </p>
        ) : null}
      </SectionCard>

      <SectionCard title={`Pasajeros (${pasajerosTotal})`}>
        {salida.reservations.length === 0 ? (
          <EmptyState title="Esta salida no tiene reservas." />
        ) : (
          <TableShell>
            <table className="w-full min-w-[760px] text-left text-sm">
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
                      <td className="px-4 py-3">
                        <StatusBadge label={reservationStatusLabel(r.status)} tone={reservationStatusTone(r.status)} />
                      </td>
                      <td className="tabular px-4 py-3">
                        {p.boardedAt ? formatCaracasTime24(p.boardedAt) : "No"}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </TableShell>
        )}
      </SectionCard>
    </div>
  );
}

/** Un paso del recorrido, con su estado y la confirmación opcional debajo. */
function PasoRecorrido({
  numero,
  titulo,
  hecho,
  disponible,
  ahora,
  children,
}: {
  numero: number;
  titulo: string;
  hecho: Date | null;
  disponible: boolean;
  ahora: Date;
  children?: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 border-b border-[var(--color-borde)] pb-4 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--color-borde)] text-xs font-medium">
          {numero}
        </span>
        <p className="font-medium">{titulo}</p>
        {hecho ? (
          <span className="inline-flex items-center gap-1 text-sm text-[var(--color-exito)]">
            <IconCheck className="h-4 w-4" />
            Hecho · <span className="tabular">{horaDelPaso(hecho, ahora)}</span>
          </span>
        ) : disponible ? (
          <span className="text-sm text-[var(--color-acento)]">Disponible</span>
        ) : (
          <span className="text-sm text-[var(--color-texto-suave)]">Pendiente</span>
        )}
      </div>
      {children ? <div className="pl-9">{children}</div> : null}
    </li>
  );
}

/** Confirmación explícita de un paso: pregunta y botón dentro de un `<details>`. */
function ConfirmacionPaso({
  variante,
  resumen,
  pregunta,
  textoBoton,
  action,
  departureId,
}: {
  variante: "primario" | "peligro";
  resumen: string;
  pregunta: string;
  textoBoton: string;
  action: (formData: FormData) => void | Promise<void>;
  departureId: string;
}) {
  return (
    <details>
      <summary className={panelButtonClass(variante, "md", "cursor-pointer")}>{resumen}</summary>
      <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-borde)] p-3 text-sm">
        <p>{pregunta}</p>
        <form action={action}>
          <input type="hidden" name="departureId" value={departureId} />
          <button type="submit" className={panelButtonClass(variante, "sm")}>
            {textoBoton}
          </button>
        </form>
      </div>
    </details>
  );
}
