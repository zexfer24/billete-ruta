import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { requireAgencyUser } from "@/modules/auth";
import { availableTripActions } from "@/modules/trips";
import { durationMinutes, formatCaracasDate, formatCaracasDateTime24, formatCaracasTime24, formatDuration } from "@/lib/time";
import { departureStatusLabel, departureStatusTone, reservationStatusLabel, reservationStatusTone } from "@/lib/labels";
import type { StatusTone } from "@/lib/labels";
import { PanelFeedback } from "@/components/panel-feedback";
import { Alert } from "@/components/alert";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { IconCheck, IconCheckCircle, IconClock, IconQr, IconSeat, IconUsers } from "@/components/icons";
import {
  EmptyState,
  MobileCard,
  PANEL_TD_CLASS,
  PANEL_TH_CLASS,
  PanelPageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  TableShell,
  panelButtonClass,
} from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import { departureWhenText, plural } from "../../_shared/day-label";
import { loadManifestOrNotFound } from "../../_shared/load-manifest";
import { manifestSummary, passengerBoardingState, type ManifestSummary, type PassengerBoardingState } from "../../_shared/manifest-summary";
import { registerArrivalAction, registerDepartureAction, startBoardingAction } from "../actions";

export const metadata: Metadata = { title: "Detalle de la salida" };

/** Traduce el código corto de `?ok=` a un texto. Un código desconocido no muestra nada. */
const OK_LABELS: Record<string, string> = {
  embarque: "Embarque iniciado. Ya puedes abrir el escáner y revisar los tickets en la puerta.",
  salida: "Salida registrada. Cuando el bus llegue a destino, registra la llegada.",
  llegada: "Llegada registrada. El viaje quedó terminado.",
};

/** Etiqueta y tono de la columna de abordaje. */
const BOARDING_BADGE: Record<PassengerBoardingState, { label: string; tone: StatusTone }> = {
  "a-bordo": { label: "A bordo", tone: "exito" },
  "por-abordar": { label: "Por abordar", tone: "alerta" },
  "no-viaja": { label: "No viaja", tone: "neutro" },
};

/** Orden de la lista de pasajeros: primero quienes faltan por subir, al final quienes no viajan. */
const BOARDING_ORDER: Record<PassengerBoardingState, number> = { "por-abordar": 0, "a-bordo": 1, "no-viaja": 2 };

/**
 * Hora de un paso del recorrido: solo "HH:mm" si ocurrió hoy (en Caracas);
 * con la fecha completa si no, para no dar a entender que fue hoy.
 */
function horaDelPaso(fecha: Date, ahora: Date): string {
  return formatCaracasDate(fecha) === formatCaracasDate(ahora)
    ? formatCaracasTime24(fecha)
    : formatCaracasDateTime24(fecha);
}

function capitalizar(texto: string): string {
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}`;
}

type EstadoPaso = "hecho" | "actual" | "pendiente" | "omitido";

/**
 * Hoja de una salida: los tres pasos del viaje (iniciar embarque, registrar
 * la salida y la llegada) con solo la acción que toca ahora, el conteo de
 * abordaje y la lista de pasajeros.
 */
export default async function SalidaDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string | string[]; ok?: string | string[] }>;
}) {
  const { agencyId } = await requireAgencyUser("trips.manage");
  const { id } = await params;
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : undefined;
  const ok = typeof query.ok === "string" ? OK_LABELS[query.ok] : undefined;

  const salida = await loadManifestOrNotFound(id, agencyId);

  const ahora = new Date();
  const boardingStartedAt = salida.tripLog?.boardingStartedAt ?? null;
  const departedAt = salida.tripLog?.departedAt ?? null;
  const arrivedAt = salida.tripLog?.arrivedAt ?? null;
  const duracion =
    departedAt && arrivedAt ? formatDuration(durationMinutes(departedAt, arrivedAt)) : null;

  const acciones = availableTripActions({ status: salida.status, boardingStartedAt, departedAt, arrivedAt });
  const resumen = manifestSummary({ capacity: salida.capacity, reservations: salida.reservations });
  const cancelada = salida.status === "CANCELADA";

  // Solo el primer paso pendiente y disponible muestra su botón: así nunca
  // hay dos acciones del recorrido compitiendo en la pantalla.
  const pasos = [
    { hecho: boardingStartedAt, disponible: acciones.startBoarding },
    { hecho: departedAt, disponible: acciones.registerDeparture },
    { hecho: arrivedAt, disponible: acciones.registerArrival },
  ];
  const actual = cancelada ? -1 : pasos.findIndex((p) => !p.hecho && p.disponible);
  const estados: EstadoPaso[] = pasos.map((p, i) => {
    if (p.hecho) return "hecho";
    if (cancelada) return "omitido";
    if (i === actual) return "actual";
    // Un paso anterior sin hacer cuando uno posterior ya se hizo (salida sin embarque previo).
    if (pasos.slice(i + 1).some((siguiente) => siguiente.hecho)) return "omitido";
    return "pendiente";
  });

  const pasajeros = salida.reservations
    .flatMap((r) =>
      r.passengers.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        idNumber: p.idNumber,
        isHolder: p.isHolder,
        code: r.code,
        reservationStatus: r.status,
        boardedAt: p.boardedAt,
        estado: passengerBoardingState(r.status, p.boardedAt),
      })),
    )
    .sort((a, b) => BOARDING_ORDER[a.estado] - BOARDING_ORDER[b.estado]);

  const cuando = capitalizar(departureWhenText(salida.departsAt, ahora));
  const abordajeHref = `/panel/abordaje/${salida.id}`;
  const campos = { departureId: salida.id };

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader
        back={{ href: "/panel/salidas", label: "Volver a salidas" }}
        title={salida.route.name}
        description={
          <>
            <span className="tabular">{cuando}</span> · Vehículo <span className="tabular">{salida.vehicle.plate}</span>{" "}
            · Chofer {salida.driver.fullName}
          </>
        }
        actions={<StatusBadge label={departureStatusLabel(salida.status)} tone={departureStatusTone(salida.status)} />}
      />

      <PanelFeedback error={error} ok={ok} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="A bordo"
          value={resumen.boarded}
          detail={`de ${plural(resumen.expected, "pasajero esperado", "pasajeros esperados")}`}
          tone="exito"
          icon={<IconCheckCircle />}
        />
        <StatCard
          label="Por abordar"
          value={resumen.pending}
          detail={resumen.pending === 0 ? "No falta nadie por subir" : "Todavía no han subido"}
          tone={resumen.pending > 0 ? "alerta" : "neutro"}
          icon={<IconClock />}
        />
        <StatCard
          label="Puestos libres"
          value={resumen.free}
          detail={`de ${plural(salida.capacity, "puesto", "puestos")}`}
          icon={<IconSeat />}
        />
      </div>

      <SectionCard title="Pasos del viaje" description="Sigue los pasos en orden. Solo se muestra el botón del paso que toca ahora.">
        <ol className="flex flex-col">
          <Paso
            numero={1}
            titulo="Iniciar el embarque"
            estado={estados[0] ?? "pendiente"}
            hechoTexto={boardingStartedAt ? `Hecho a las ${horaDelPaso(boardingStartedAt, ahora)}` : null}
            esperaTexto="Se habilita mientras la salida esté programada."
          >
            <p className="text-base leading-relaxed text-tinta-suave">
              Al iniciar el embarque se cierra la venta de pasajes de esta salida y se abre el escáner para revisar los
              tickets en la puerta del bus.
            </p>
            <ConfirmDialog
              triggerLabel="Iniciar embarque"
              triggerClassName={panelButtonClass("primario", "lg", "w-full sm:w-fit")}
              title="¿Iniciar el embarque?"
              description={
                <p>
                  Se cierra la venta: ya no se podrán vender pasajes para esta salida.{" "}
                  {resumen.expected > 0
                    ? `Hay ${plural(resumen.expected, "pasajero", "pasajeros")} con reserva.`
                    : "Todavía no hay pasajeros con reserva."}
                </p>
              }
              confirmLabel="Sí, iniciar embarque"
              pendingLabel="Iniciando embarque…"
              action={startBoardingAction}
              fields={campos}
            />
          </Paso>

          <Paso
            numero={2}
            titulo="Registrar la salida del bus"
            estado={estados[1] ?? "pendiente"}
            hechoTexto={departedAt ? `Salió a las ${horaDelPaso(departedAt, ahora)}` : null}
            esperaTexto="Se habilita después de iniciar el embarque."
          >
            <p className="text-base leading-relaxed text-tinta-suave">
              {resumen.pending > 0
                ? `Faltan ${plural(resumen.pending, "pasajero", "pasajeros")} por abordar. Escanea sus tickets antes de registrar la salida.`
                : "Todos los pasajeros con reserva ya subieron. Registra la salida cuando el bus arranque."}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={abordajeHref}
                className={panelButtonClass(resumen.pending > 0 ? "primario" : "secundario", "lg", "w-full sm:w-fit")}
              >
                <IconQr className="size-5 shrink-0" />
                Abrir el escáner de abordaje
              </Link>
              <ConfirmDialog
                tone={resumen.pending > 0 ? "peligro" : "normal"}
                triggerLabel="Registrar salida"
                triggerClassName={panelButtonClass(
                  resumen.pending > 0 ? "peligro" : "primario",
                  "lg",
                  "w-full sm:w-fit",
                )}
                title="¿Registrar la salida del bus?"
                description={<ConsecuenciasSalida resumen={resumen} />}
                confirmLabel="Sí, registrar salida"
                pendingLabel="Registrando salida…"
                action={registerDepartureAction}
                fields={campos}
              />
            </div>
          </Paso>

          <Paso
            numero={3}
            titulo="Registrar la llegada"
            estado={estados[2] ?? "pendiente"}
            hechoTexto={arrivedAt ? `Llegó a las ${horaDelPaso(arrivedAt, ahora)}` : null}
            esperaTexto="Se habilita después de registrar la salida."
          >
            <p className="text-base leading-relaxed text-tinta-suave">
              Cuando el bus llegue a destino, registra la llegada para cerrar el viaje.
            </p>
            <ConfirmDialog
              triggerLabel="Registrar llegada"
              triggerClassName={panelButtonClass("primario", "lg", "w-full sm:w-fit")}
              title="¿Registrar la llegada del bus?"
              description={
                <p>
                  Se guarda la hora de llegada de ahora y el viaje queda terminado. Esto no se puede deshacer.
                </p>
              }
              confirmLabel="Sí, registrar llegada"
              pendingLabel="Registrando llegada…"
              action={registerArrivalAction}
              fields={campos}
            />
          </Paso>
        </ol>

        {arrivedAt ? (
          <Alert tone="exito" role="none" title="Viaje terminado" className="mt-5">
            {duracion ? (
              <>
                Duración del recorrido: <span className="tabular font-semibold">{duracion}</span>.
              </>
            ) : (
              "El viaje quedó cerrado."
            )}
          </Alert>
        ) : null}
        {cancelada ? (
          <Alert tone="peligro" role="none" title="Esta salida fue cancelada" className="mt-5">
            Sus pasajeros ya no pueden abordar.
          </Alert>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Pasajeros"
        description={
          pasajeros.length > 0
            ? `${plural(pasajeros.length, "pasajero", "pasajeros")} en ${plural(salida.reservations.length, "reserva", "reservas")}. Primero los que faltan por subir.`
            : undefined
        }
      >
        {pasajeros.length === 0 ? (
          <EmptyState
            icon={<IconUsers />}
            title="Esta salida todavía no tiene pasajeros"
            description="Cuando alguien compre un pasaje para esta salida, aparecerá aquí."
            action={
              salida.status === "PROGRAMADA" ? (
                <Link href="/panel/taquilla" className={panelButtonClass("secundario")}>
                  Vender en taquilla
                </Link>
              ) : undefined
            }
          />
        ) : (
          <TableShell
            mobile={
              <ul className="flex flex-col gap-3">
                {pasajeros.map((p) => (
                  <MobileCard
                    key={p.id}
                    title={p.fullName}
                    subtitle={p.isHolder ? "Titular de la reserva" : undefined}
                    status={<AbordajeBadge estado={p.estado} boardedAt={p.boardedAt} ahora={ahora} />}
                    details={[
                      { label: "Cédula", value: p.idNumber },
                      { label: "Código del ticket", value: <span className="break-all">{p.code}</span> },
                      {
                        label: "Pago",
                        value: (
                          <StatusBadge
                            label={reservationStatusLabel(p.reservationStatus)}
                            tone={reservationStatusTone(p.reservationStatus)}
                          />
                        ),
                      },
                    ]}
                  />
                ))}
              </ul>
            }
          >
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-borde bg-lienzo">
                <tr>
                  <th scope="col" className={PANEL_TH_CLASS}>Pasajero</th>
                  <th scope="col" className={PANEL_TH_CLASS}>Cédula</th>
                  <th scope="col" className={PANEL_TH_CLASS}>Código del ticket</th>
                  <th scope="col" className={PANEL_TH_CLASS}>Pago</th>
                  <th scope="col" className={PANEL_TH_CLASS}>Abordaje</th>
                </tr>
              </thead>
              <tbody>
                {pasajeros.map((p) => (
                  <tr key={p.id} className="border-b border-borde last:border-0">
                    <td className={PANEL_TD_CLASS}>
                      <p className="font-semibold">{p.fullName}</p>
                      {p.isHolder ? <p className="text-sm text-tinta-suave">Titular de la reserva</p> : null}
                    </td>
                    <td className={cx(PANEL_TD_CLASS, "tabular")}>{p.idNumber}</td>
                    <td className={cx(PANEL_TD_CLASS, "tabular")}>{p.code}</td>
                    <td className={PANEL_TD_CLASS}>
                      <StatusBadge
                        label={reservationStatusLabel(p.reservationStatus)}
                        tone={reservationStatusTone(p.reservationStatus)}
                      />
                    </td>
                    <td className={PANEL_TD_CLASS}>
                      <AbordajeBadge estado={p.estado} boardedAt={p.boardedAt} ahora={ahora} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        )}
      </SectionCard>
    </div>
  );
}

/** Pastilla de abordaje de un pasajero, con la hora a la que subió. */
function AbordajeBadge({
  estado,
  boardedAt,
  ahora,
}: {
  estado: PassengerBoardingState;
  boardedAt: Date | null;
  ahora: Date;
}) {
  const { label, tone } = BOARDING_BADGE[estado];
  return <StatusBadge label={boardedAt ? `${label} · ${horaDelPaso(boardedAt, ahora)}` : label} tone={tone} />;
}

/** Qué pasa con cada reserva al registrar la salida, en números. */
function ConsecuenciasSalida({ resumen }: { resumen: ManifestSummary }) {
  const hayAfectadas = resumen.noShowReservations > 0 || resumen.cancelReservations > 0;
  return (
    <div className="flex flex-col gap-2">
      <p>
        El bus sale con{" "}
        <strong className="font-semibold text-tinta">
          {plural(resumen.boarded, "pasajero a bordo", "pasajeros a bordo")}
        </strong>
        .
      </p>
      {hayAfectadas ? (
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {resumen.noShowReservations > 0 ? (
            <li>
              {resumen.noShowReservations === 1
                ? "1 reserva pagada quedará como «No se presentó»"
                : `${resumen.noShowReservations} reservas pagadas quedarán como «No se presentó»`}{" "}
              ({plural(resumen.noShowPassengers, "pasajero", "pasajeros")}).
            </li>
          ) : null}
          {resumen.cancelReservations > 0 ? (
            <li>
              {resumen.cancelReservations === 1
                ? "Se cancelará 1 reserva sin pago completo"
                : `Se cancelarán ${resumen.cancelReservations} reservas sin pago completo`}{" "}
              ({plural(resumen.cancelPassengers, "pasajero", "pasajeros")}).
            </li>
          ) : null}
        </ul>
      ) : (
        <p>No queda ninguna reserva sin abordar.</p>
      )}
      <p className="font-semibold text-tinta">Esto no se puede deshacer.</p>
    </div>
  );
}

/** Un paso del viaje: círculo con su estado, título, texto de estado y, si es el actual, su contenido. */
function Paso({
  numero,
  titulo,
  estado,
  hechoTexto,
  esperaTexto,
  children,
}: {
  numero: number;
  titulo: string;
  estado: EstadoPaso;
  hechoTexto: string | null;
  esperaTexto: string;
  children: ReactNode;
}) {
  return (
    <li
      aria-current={estado === "actual" ? "step" : undefined}
      className="relative flex gap-4 pb-6 last:pb-0 before:absolute before:left-5 before:top-11 before:bottom-1 before:w-0.5 before:-translate-x-1/2 before:bg-borde last:before:hidden"
    >
      <span
        aria-hidden="true"
        className={cx(
          "relative grid size-10 shrink-0 place-items-center rounded-full text-base font-bold",
          estado === "hecho" && "bg-exito text-white",
          estado === "actual" && "bg-marca-600 text-white ring-4 ring-marca-100",
          estado === "pendiente" && "border-2 border-borde-control bg-superficie text-tinta-suave",
          estado === "omitido" && "border-2 border-borde bg-lienzo text-tinta-tenue",
        )}
      >
        {estado === "hecho" ? <IconCheck className="size-5" /> : numero}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-1.5">
        <div className="flex flex-col gap-0.5">
          <p className={cx("text-base font-semibold", estado === "pendiente" || estado === "omitido" ? "text-tinta-suave" : "text-tinta")}>
            <span className="sr-only">Paso {numero}: </span>
            {titulo}
          </p>
          {estado === "hecho" && hechoTexto ? (
            <p className="tabular text-sm font-semibold text-exito">{hechoTexto}</p>
          ) : estado === "actual" ? (
            <p className="text-sm font-semibold text-marca-700">Paso actual</p>
          ) : estado === "omitido" ? (
            <p className="text-sm text-tinta-suave">No se registró</p>
          ) : (
            <p className="text-sm text-tinta-suave">{esperaTexto}</p>
          )}
        </div>
        {estado === "actual" ? children : null}
      </div>
    </li>
  );
}
