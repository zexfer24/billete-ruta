import Link from "next/link";
import type { AgencyDepartureRow } from "@/modules/catalog";
import { formatCaracasTime24, formatRelativeDeparture } from "@/lib/time";
import { Alert } from "@/components/alert";
import { panelButtonClass } from "@/components/panel-ui";
import { IconChevronRight } from "@/components/icons";
import {
  departuresNeedingAttention,
  MAX_ATTENTION_DEPARTURES,
  BOARDING_SOON_MINUTES,
  type AttentionKind,
} from "./attention";
import { countLabel } from "./text";

/** Texto del aviso de una salida según por qué pide atención. */
function departureMessage(departure: AgencyDepartureRow, kind: AttentionKind, now: Date): string {
  const hora = formatCaracasTime24(departure.departsAt);
  const puestos = `${departure.occupied} de ${countLabel(departure.capacity, "puesto vendido", "puestos vendidos")}`;
  switch (kind) {
    case "atrasada":
      return `Debía salir a las ${hora} y todavía no se registra la salida. ${puestos}.`;
    case "embarcando": {
      const cuando =
        departure.departsAt.getTime() < now.getTime()
          ? `Debía salir a las ${hora}`
          : formatRelativeDeparture(departure.departsAt, now);
      return `El embarque está abierto. ${cuando}. ${puestos}.`;
    }
    case "pronto":
      return `${formatRelativeDeparture(departure.departsAt, now)}. ${puestos}.`;
  }
}

/** Botón del aviso: durante el embarque lleva al abordaje; si no, a la hoja de la salida. */
function departureAction(departure: AgencyDepartureRow, kind: AttentionKind) {
  if (kind === "embarcando") {
    return { href: `/panel/abordaje/${departure.id}`, label: "Registrar abordaje" };
  }
  return { href: `/panel/salidas/${departure.id}`, label: "Abrir la salida" };
}

/**
 * "Lo que necesita tu atención" (spec 7.2): comprobantes por revisar y
 * salidas que embarcan pronto, cada aviso con un solo botón. Si no hay nada
 * pendiente lo dice con claridad, para que el operador no se quede buscando.
 */
export async function AttentionBlock({
  pendingProofs,
  departures,
  now,
}: {
  pendingProofs: Promise<number>;
  departures: Promise<AgencyDepartureRow[]>;
  now: Date;
}) {
  const [comprobantes, salidas] = await Promise.all([pendingProofs, departures]);
  const atencion = departuresNeedingAttention(salidas, now);
  const visibles = atencion.slice(0, MAX_ATTENTION_DEPARTURES);
  const ventanaHoras = BOARDING_SOON_MINUTES / 60;

  if (comprobantes === 0 && atencion.length === 0) {
    return (
      <Alert tone="exito" role="none" title="Todo al día">
        No hay comprobantes por revisar ni salidas en las próximas {ventanaHoras} horas.
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {comprobantes > 0 ? (
        <Alert
          tone="alerta"
          role="none"
          title={
            comprobantes === 1
              ? "1 comprobante espera tu revisión"
              : `${countLabel(comprobantes, "comprobante", "comprobantes")} esperan tu revisión`
          }
          action={
            <Link href="/panel/pasajeros?vista=por-revisar" className={panelButtonClass("secundario")}>
              Revisar comprobantes
            </Link>
          }
        >
          Revísalos para confirmar los pagos. El ticket se emite solo cuando la reserva queda pagada.
        </Alert>
      ) : null}

      {visibles.map(({ departure, kind }) => {
        const accion = departureAction(departure, kind);
        return (
          <Alert
            key={departure.id}
            tone={kind === "atrasada" ? "alerta" : "info"}
            role="none"
            title={`${formatCaracasTime24(departure.departsAt)} · ${departure.origin} → ${departure.destination}`}
            action={
              <Link href={accion.href} className={panelButtonClass("secundario")}>
                {accion.label}
              </Link>
            }
          >
            {departureMessage(departure, kind, now)}
          </Alert>
        );
      })}

      {atencion.length > visibles.length ? (
        <Link
          href="/panel/salidas"
          className="foco inline-flex min-h-11 w-fit items-center gap-1 rounded-control px-2 text-[15px] font-semibold text-marca-700 hover:bg-marca-50"
        >
          Ver las {atencion.length} salidas que piden atención
          <IconChevronRight className="size-5" />
        </Link>
      ) : null}
    </div>
  );
}
