import type { Metadata } from "next";
import Link from "next/link";
import { requireAgencyUser } from "@/modules/auth";
import { Alert } from "@/components/alert";
import { PanelPageHeader, ProgressBar, panelButtonClass } from "@/components/panel-ui";
import { departureWhenText } from "../../_shared/day-label";
import { loadManifestOrNotFound } from "../../_shared/load-manifest";
import { manifestSummary } from "../../_shared/manifest-summary";
import { AbordajeScanner } from "./scanner";

export const metadata: Metadata = { title: "Abordaje" };

/**
 * Pantalla de abordaje de una salida: dice qué bus se está embarcando, cuántos
 * pasajeros ya subieron y deja buscar cada ticket. Solo se abre mientras la
 * salida está embarcando o en ruta; en cualquier otro estado explica por qué
 * y lleva de vuelta a la hoja de la salida con el botón del aviso (sin un
 * segundo enlace de volver que lleve al mismo sitio). La columna es estrecha
 * para leerse de un vistazo en la puerta del bus, pero alineada a la izquierda
 * como el resto del panel.
 */
export default async function AbordajePage({
  params,
}: {
  params: Promise<{ departureId: string }>;
}) {
  const { agencyId } = await requireAgencyUser("boarding.manage");
  const { departureId } = await params;
  const salida = await loadManifestOrNotFound(departureId, agencyId);

  const ahora = new Date();
  const resumen = manifestSummary({ capacity: salida.capacity, reservations: salida.reservations });
  const abierto = salida.status === "MANIFIESTO_CERRADO" || salida.status === "EN_RUTA";
  const verbo = salida.status === "EN_RUTA" || salida.status === "FINALIZADA" ? "salió" : "sale";
  const hojaHref = `/panel/salidas/${salida.id}`;

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <PanelPageHeader
        back={abierto ? { href: hojaHref, label: "Volver a la salida" } : undefined}
        title="Abordaje"
        description={
          <>
            <span className="font-semibold text-tinta">{salida.route.name}</span>, {verbo}{" "}
            <span className="tabular">{departureWhenText(salida.departsAt, ahora)}</span>. Vehículo{" "}
            <span className="tabular">{salida.vehicle.plate}</span>.
          </>
        }
      />

      {abierto ? (
        <>
          <div className="rounded-tarjeta border border-borde bg-superficie p-5 shadow-1">
            <ProgressBar
              value={resumen.boarded}
              max={Math.max(resumen.expected, 1)}
              label={`${resumen.boarded} de ${resumen.expected} ${resumen.expected === 1 ? "pasajero" : "pasajeros"} a bordo`}
              tone="exito"
              detail={
                resumen.expected === 0
                  ? "Sin pasajeros"
                  : resumen.pending === 0
                    ? "Ya subieron todos"
                    : `Faltan ${resumen.pending}`
              }
            />
          </div>
          <AbordajeScanner departureId={salida.id} />
        </>
      ) : (
        <Alert
          tone={salida.status === "PROGRAMADA" ? "info" : "alerta"}
          role="none"
          title={
            salida.status === "PROGRAMADA"
              ? "El abordaje todavía no está abierto"
              : salida.status === "CANCELADA"
                ? "Esta salida fue cancelada"
                : "Este viaje ya terminó"
          }
          action={
            <Link href={hojaHref} className={panelButtonClass("secundario")}>
              {salida.status === "PROGRAMADA" ? "Ir a iniciar el embarque" : "Ver la hoja de la salida"}
            </Link>
          }
        >
          {salida.status === "PROGRAMADA"
            ? "Para escanear los tickets, primero inicia el embarque en la hoja de la salida."
            : "Ya no se pueden registrar pasajeros a bordo."}
        </Alert>
      )}
    </div>
  );
}
