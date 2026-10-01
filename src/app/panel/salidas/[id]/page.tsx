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
import { IconCheck, IconCheckCircle, IconChevronDown, IconClock, IconQr, IconSeat, IconUsers } from "@/components/icons";
import {
  EmptyState,
  PANEL_TD_CLASS,
  PANEL_TH_CLASS,
  PanelPageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  panelButtonClass,
} from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import { errorMessage, okMessage } from "../../_dashboard/search-params";
import { CompactFigures } from "../../_shared/compact-figures";
import { departureWhenText, plural } from "../../_shared/day-label";
import { departureNotice } from "../../_shared/departure-notice";
import { DepartureNoticeText } from "../../_shared/departure-notice-text";
import { loadManifestOrNotFound } from "../../_shared/load-manifest";
import {
  manifestSummary,
  passengerBoardingState,
  reservationOwesMoney,
  type ManifestSummary,
  type PassengerBoardingState,
} from "../../_shared/manifest-summary";
import { registerArrivalAction, registerDepartureAction, startBoardingAction } from "../actions";

export const metadata: Metadata = { title: "Detalle de la salida" };

/** Traduce el código corto de `?ok=` a un texto. Un código desconocido no muestra nada. */
const OK_LABELS: Readonly<Record<string, string>> = {
  embarque: "Embarque iniciado. Ya puedes abrir el escáner y revisar los tickets en la puerta.",
  salida: "Salida registrada. Cuando el bus llegue a destino, registra la llegada.",
  llegada: "Llegada registrada. El viaje quedó terminado.",
};

/**
 * Etiqueta y tono de la columna de abordaje. "Por abordar" solo pide atención
 * (ámbar) cuando el embarque ya empezó; antes es un estado normal y va neutro,
 * para que la lista no se llene de color de alerta sin nada que atender.
 */
const BOARDING_BADGE: Record<PassengerBoardingState, { label: string; tone: StatusTone }> = {
  "a-bordo": { label: "A bordo", tone: "exito" },
  "por-abordar": { label: "Por abordar", tone: "alerta" },
  "no-viaja": { label: "No viaja", tone: "neutro" },
};

function boardingBadge(estado: PassengerBoardingState, embarqueIniciado: boolean): { label: string; tone: StatusTone } {
  const badge = BOARDING_BADGE[estado];
  return estado === "por-abordar" && !embarqueIniciado ? { ...badge, tone: "neutro" } : badge;
}

/**
 * Por qué no viaja un pasajero, en una sola pastilla (sin repetir "No viaja"
 * y "Liberada" en dos pastillas grises). `ABORDADA` sin hora de abordaje es
 * un acompañante que no subió con su grupo.
 */
const NO_VIAJA_LABELS: Readonly<Record<string, string>> = {
  LIBERADA: "No viaja: puesto liberado",
  CANCELADA: "No viaja: reserva cancelada",
  NO_SHOW: "No viaja: no se presentó",
  ABORDADA: "No viaja: no subió con su grupo",
};

function noViajaLabel(reservationStatus: string): string {
  return NO_VIAJA_LABELS[reservationStatus] ?? "No viaja";
}

/**
 * Frase que resume la lista de pasajeros. Cuenta solo a los que viajan (a
 * bordo o por abordar), para que coincida con "pasajeros esperados" de las
 * cifras; los que no viajan se nombran aparte porque van al final.
 */
function pasajerosDescripcion(pasajeros: ReadonlyArray<{ estado: PassengerBoardingState; code: string }>): string {
  const viajan = pasajeros.filter((p) => p.estado !== "no-viaja");
  const noViajan = pasajeros.length - viajan.length;
  const extra =
    noViajan === 0
      ? ""
      : noViajan === 1
        ? " 1 pasajero no viaja y aparece al final."
        : ` ${noViajan} pasajeros no viajan y aparecen al final.`;
  if (viajan.length === 0) {
    return noViajan === 1
      ? "Nadie viaja por ahora: el pasajero de la lista no viaja."
      : `Nadie viaja por ahora: los ${noViajan} pasajeros de la lista no viajan.`;
  }
  const reservas = new Set(viajan.map((p) => p.code)).size;
  return `${plural(viajan.length, "pasajero", "pasajeros")} en ${plural(reservas, "reserva", "reservas")}. Primero los que faltan por subir.${extra}`;
}

/**
 * Quiénes de los que faltan no pueden subir todavía, en dos grupos con una
 * acción distinta: los que deben dinero (hay que cobrarles) y los que enviaron
 * un comprobante (hay que revisarlo, no cobrarles: sería un doble cobro). Por
 * ejemplo "3 todavía deben dinero y 2 esperan que revises su comprobante", o
 * `null` si no hay nadie así.
 */
function atencionPartes(resumen: ManifestSummary): string | null {
  const partes: string[] = [];
  const deben = resumen.owingPassengers;
  const revisar = resumen.reviewPassengers;
  if (deben > 0) partes.push(`${deben} todavía ${deben === 1 ? "debe" : "deben"} dinero`);
  if (revisar > 0) partes.push(`${revisar} ${revisar === 1 ? "espera" : "esperan"} que revises su comprobante`);
  return partes.length > 0 ? partes.join(" y ") : null;
}

/**
 * Qué hacer con ellos y hasta cuándo: al registrar la salida, las reservas
 * sin pago completo se cancelan, así que hay que atenderlos antes.
 */
function atencionAccion(resumen: ManifestSummary): string {
  const uno = resumen.unpaidPassengers === 1;
  const verbo =
    resumen.reviewPassengers === 0
      ? uno
        ? "Cóbrale"
        : "Cóbrales"
      : resumen.owingPassengers === 0
        ? uno
          ? "Revisa su comprobante"
          : "Revisa sus comprobantes"
        : "Atiéndelos";
  return `${verbo} antes de registrar la salida: si no, ${uno ? "su reserva se cancela" : "sus reservas se cancelan"}.`;
}

/**
 * Texto del paso 2 ("Registrar la salida"): cuántos faltan y, si algunos
 * todavía no pueden subir (deben dinero o esperan la revisión de su
 * comprobante), cuántos pueden subir ya y qué hacer con los demás antes de
 * registrar la salida. El escáner solo deja pasar reservas pagadas o de pago
 * en taquilla; estas últimas todavía no tienen ticket, por eso no se habla de
 * "su ticket".
 */
function faltanTexto(resumen: ManifestSummary): string {
  if (resumen.pending === 0) {
    return "Todos los pasajeros con reserva ya subieron. Registra la salida cuando el bus arranque.";
  }
  const faltan = `Faltan ${plural(resumen.pending, "pasajero", "pasajeros")} por abordar`;
  const partes = atencionPartes(resumen);
  if (!partes) return `${faltan}. Escanea sus tickets antes de registrar la salida.`;
  const listos = resumen.pending - resumen.unpaidPassengers;
  if (listos === 0) {
    return `${faltan} y ninguno puede subir todavía: ${partes}. ${atencionAccion(resumen)}`;
  }
  return `${faltan}: ${listos} ya ${listos === 1 ? "puede" : "pueden"} subir y ${partes}. ${atencionAccion(resumen)}`;
}

/** Orden de la lista de pasajeros: primero quienes faltan por subir, al final quienes no viajan. */
const BOARDING_ORDER: Record<PassengerBoardingState, number> = { "por-abordar": 0, "a-bordo": 1, "no-viaja": 2 };

interface PasajeroFila {
  id: string;
  fullName: string;
  idNumber: string;
  isHolder: boolean;
  code: string;
  reservationStatus: string;
  boardedAt: Date | null;
  estado: PassengerBoardingState;
}

/** Pasajeros seguidos de una misma reserva y situación, para la lista del teléfono. */
interface GrupoReserva {
  key: string;
  code: string;
  reservationStatus: string;
  estado: PassengerBoardingState;
  pasajeros: PasajeroFila[];
}

/**
 * Agrupa la lista ya ordenada por reserva: en el teléfono el código y el
 * pago se dicen una vez por reserva, no en cada pasajero. Una reserva con
 * unos a bordo y otros por subir sale en dos grupos, uno en cada sección.
 */
function agruparPorReserva(pasajeros: readonly PasajeroFila[]): GrupoReserva[] {
  const grupos: GrupoReserva[] = [];
  for (const p of pasajeros) {
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.code === p.code && ultimo.estado === p.estado) {
      ultimo.pasajeros.push(p);
    } else {
      grupos.push({
        key: `${p.code}-${p.estado}`,
        code: p.code,
        reservationStatus: p.reservationStatus,
        estado: p.estado,
        pasajeros: [p],
      });
    }
  }
  return grupos;
}

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
 * abordaje y la lista de pasajeros. Los pasos van antes de las cifras para
 * que, en el teléfono, el botón del paso actual se vea sin desplazarse.
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
  const error = errorMessage(query.error);
  const ok = okMessage(OK_LABELS, query.ok);

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
  const embarqueIniciado = salida.status !== "PROGRAMADA";

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

  const pasajeros: PasajeroFila[] = salida.reservations
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
    // Entre los que faltan, primero los que todavía deben dinero (lo que hay
    // que atender antes de la puerta); los de una misma reserva quedan juntos.
    .sort(
      (a, b) =>
        BOARDING_ORDER[a.estado] - BOARDING_ORDER[b.estado] ||
        (a.estado === "por-abordar"
          ? Number(reservationOwesMoney(b.reservationStatus)) - Number(reservationOwesMoney(a.reservationStatus))
          : 0) ||
        a.code.localeCompare(b.code),
    );
  const grupos = agruparPorReserva(pasajeros);
  const gruposViajan = grupos.filter((g) => g.estado !== "no-viaja");
  const gruposNoViajan = grupos.filter((g) => g.estado === "no-viaja");
  const cuantosNoViajan = gruposNoViajan.reduce((n, g) => n + g.pasajeros.length, 0);

  const cuando = capitalizar(departureWhenText(salida.departsAt, ahora));
  const aviso = departureNotice(salida, ahora);
  const abordajeHref = `/panel/abordaje/${salida.id}`;
  const campos = { departureId: salida.id };
  // Quienes deben dinero o esperan la revisión de su comprobante solo
  // importan mientras la salida no ha partido: al registrar la salida esas
  // reservas se cancelan.
  const antesDeSalir = salida.status === "PROGRAMADA" || salida.status === "MANIFIESTO_CERRADO";
  const debenDinero = antesDeSalir ? resumen.owingPassengers : 0;
  const esperanRevision = antesDeSalir ? resumen.reviewPassengers : 0;
  const porCobrarHref = `/panel/pasajeros?vista=por-cobrar&salida=${salida.id}`;
  const porRevisarHref = `/panel/pasajeros?vista=por-revisar&salida=${salida.id}`;
  const atencion = atencionPartes(resumen);
  // Antes de iniciar el embarque todos están "Por abordar": la columna y las
  // pastillas no dirían nada que la cifra "Por abordar" no diga ya.
  const mostrarAbordaje = embarqueIniciado || resumen.boarded > 0;

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
        actions={
          <>
            <StatusBadge label={departureStatusLabel(salida.status)} tone={departureStatusTone(salida.status)} />
            {aviso ? <DepartureNoticeText aviso={aviso} /> : null}
          </>
        }
      />

      <PanelFeedback error={error} ok={ok} />

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
                  {atencion ? ` De ellos, ${atencion}. ${atencionAccion(resumen)}` : null}
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
            <p className="text-base leading-relaxed text-tinta-suave">{faltanTexto(resumen)}</p>
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
                // Con pasajeros por subir, el escáner es la acción principal y
                // registrar la salida queda en contorno; el diálogo avisa en rojo.
                triggerClassName={panelButtonClass(
                  resumen.pending > 0 ? "secundario" : "primario",
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

      {/* En el teléfono, las tres cifras en una sola tarjeta; desde `sm`, tres tarjetas. */}
      <CompactFigures
        figures={[
          { label: "A bordo", value: resumen.boarded, detail: `de ${resumen.expected}` },
          { label: "Por abordar", value: resumen.pending },
          { label: "Puestos libres", value: resumen.free, detail: `de ${salida.capacity}` },
        ]}
      />
      <div className="hidden grid-cols-1 gap-4 sm:grid sm:grid-cols-3">
        <StatCard
          label="A bordo"
          value={resumen.boarded}
          detail={`de ${plural(resumen.expected, "pasajero esperado", "pasajeros esperados")}`}
          // Verde solo cuando alguien ya subió: "0 a bordo" no es un logro.
          tone={resumen.boarded > 0 ? "exito" : "neutro"}
          icon={<IconCheckCircle />}
        />
        <StatCard
          label="Por abordar"
          value={resumen.pending}
          detail={
            resumen.pending === 0
              ? "No falta nadie por subir"
              : embarqueIniciado
                ? "Todavía no han subido"
                : "El embarque no ha empezado"
          }
          tone={resumen.pending > 0 && embarqueIniciado ? "alerta" : "neutro"}
          icon={<IconClock />}
        />
        <StatCard
          label="Puestos libres"
          value={resumen.free}
          detail={`de ${plural(salida.capacity, "puesto", "puestos")}`}
          icon={<IconSeat />}
        />
      </div>

      <SectionCard
        title="Pasajeros"
        description={pasajeros.length > 0 ? pasajerosDescripcion(pasajeros) : undefined}
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
          <>
            {debenDinero > 0 || esperanRevision > 0 ? (
              <Alert
                tone="alerta"
                role="none"
                className="mb-5"
                action={
                  // La lista "Por cobrar" cuenta reservas (también las de pago
                  // en taquilla), así que el botón nombra lo que abre.
                  <div className="flex flex-wrap gap-2">
                    {debenDinero > 0 ? (
                      <Link href={porCobrarHref} className={panelButtonClass("secundario")}>
                        Ver las reservas por cobrar
                      </Link>
                    ) : null}
                    {esperanRevision > 0 ? (
                      <Link href={porRevisarHref} className={panelButtonClass("secundario")}>
                        Revisar comprobantes
                      </Link>
                    ) : null}
                  </div>
                }
              >
                {debenDinero > 0
                  ? debenDinero === 1
                    ? "1 pasajero todavía debe dinero y no podrá subir hasta pagar."
                    : `${debenDinero} pasajeros todavía deben dinero y no podrán subir hasta pagar.`
                  : null}
                {debenDinero > 0 && esperanRevision > 0 ? " " : null}
                {esperanRevision > 0
                  ? esperanRevision === 1
                    ? "1 pasajero envió un comprobante que debes revisar."
                    : `${esperanRevision} pasajeros enviaron un comprobante que debes revisar.`
                  : null}
              </Alert>
            ) : null}
            {/* Teléfono: una fila por reserva, separadas por líneas y sin tarjeta
                dentro de la tarjeta de sección. El código y el pago se dicen una
                vez por reserva; quienes no viajan quedan plegados al final. */}
            <div className="flex flex-col gap-4 md:hidden">
              {gruposViajan.length > 0 ? (
                <ul className="flex flex-col divide-y divide-borde">
                  {gruposViajan.map((g) => (
                    <GrupoMovil
                      key={g.key}
                      grupo={g}
                      ahora={ahora}
                      embarqueIniciado={embarqueIniciado}
                      mostrarAbordaje={mostrarAbordaje}
                    />
                  ))}
                </ul>
              ) : null}
              {gruposNoViajan.length > 0 ? (
                <details className="group rounded-control border border-borde">
                  <summary className="foco flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-control px-4 py-2 text-base font-semibold text-marca-700 [&::-webkit-details-marker]:hidden">
                    {cuantosNoViajan === 1 ? "Ver el pasajero que no viaja" : `Ver los ${cuantosNoViajan} pasajeros que no viajan`}
                    <IconChevronDown className="size-5 shrink-0 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" />
                  </summary>
                  <ul className="flex flex-col divide-y divide-borde border-t border-borde px-4">
                    {gruposNoViajan.map((g) => (
                      <GrupoMovil
                        key={g.key}
                        grupo={g}
                        ahora={ahora}
                        embarqueIniciado={embarqueIniciado}
                        mostrarAbordaje={mostrarAbordaje}
                        plegado
                      />
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
            {/* Escritorio y tableta: la tabla va de borde a borde de la tarjeta
                (sin el marco propio de TableShell, que dejaba un doble borde y
                robaba el relleno de la tarjeta). */}
            <div className="-m-5 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px]">
                <thead className="border-b border-borde bg-lienzo">
                  <tr>
                    <th scope="col" className={PANEL_TH_CLASS}>Pasajero</th>
                    <th scope="col" className={PANEL_TH_CLASS}>Cédula</th>
                    <th scope="col" className={PANEL_TH_CLASS}>Código de reserva</th>
                    <th scope="col" className={PANEL_TH_CLASS}>Pago</th>
                    {mostrarAbordaje ? (
                      <th scope="col" className={PANEL_TH_CLASS}>Abordaje</th>
                    ) : null}
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
                      <td className={cx(PANEL_TD_CLASS, "tabular whitespace-nowrap")}>{p.code}</td>
                      {/* La pastilla no se parte en dos renglones dentro de la tabla.
                          Quien no viaja lleva una sola pastilla con el motivo, igual
                          que en el teléfono, que ocupa Pago y Abordaje. */}
                      {p.estado === "no-viaja" ? (
                        <td colSpan={mostrarAbordaje ? 2 : 1} className={cx(PANEL_TD_CLASS, "[&>span]:whitespace-nowrap!")}>
                          <StatusBadge label={noViajaLabel(p.reservationStatus)} tone="neutro" />
                        </td>
                      ) : (
                        <>
                          <td className={cx(PANEL_TD_CLASS, "[&>span]:whitespace-nowrap!")}>
                            <StatusBadge
                              label={reservationStatusLabel(p.reservationStatus)}
                              tone={reservationStatusTone(p.reservationStatus)}
                            />
                          </td>
                          {mostrarAbordaje ? (
                            <td className={cx(PANEL_TD_CLASS, "[&>span]:whitespace-nowrap!")}>
                              <AbordajeBadge
                                estado={p.estado}
                                boardedAt={p.boardedAt}
                                ahora={ahora}
                                embarqueIniciado={embarqueIniciado}
                              />
                            </td>
                          ) : null}
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

/**
 * Una reserva en la lista del teléfono: código y pago una sola vez arriba
 * (o el motivo si no viaja) y debajo cada pasajero con su cédula y, si
 * viaja, su pastilla de abordaje. `plegado` ajusta el relleno dentro del
 * desplegable de quienes no viajan.
 */
function GrupoMovil({
  grupo,
  ahora,
  embarqueIniciado,
  mostrarAbordaje,
  plegado = false,
}: {
  grupo: GrupoReserva;
  ahora: Date;
  embarqueIniciado: boolean;
  /** Antes del embarque no se pinta la pastilla "Por abordar" de cada pasajero. */
  mostrarAbordaje: boolean;
  plegado?: boolean;
}) {
  const noViaja = grupo.estado === "no-viaja";
  return (
    <li className={cx("flex flex-col gap-3 py-4", !plegado && "first:pt-0 last:pb-0")}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="min-w-0">
          <span className="block text-sm text-tinta-suave">Código de reserva</span>
          <span className="tabular block text-[15px] font-semibold text-tinta">{grupo.code}</span>
        </p>
        {/* `ml-auto`: la pastilla queda siempre a la derecha, también cuando
            no cabe junto al código y baja a su propio renglón. */}
        <span className="ml-auto">
          {noViaja ? (
            <StatusBadge label={noViajaLabel(grupo.reservationStatus)} tone="neutro" />
          ) : (
            <StatusBadge
              label={reservationStatusLabel(grupo.reservationStatus)}
              tone={reservationStatusTone(grupo.reservationStatus)}
            />
          )}
        </span>
      </div>
      <ul className="flex flex-col gap-3 border-l-2 border-borde pl-3">
        {grupo.pasajeros.map((p) => (
          <li key={p.id} className="flex flex-col gap-1.5">
            <div className="min-w-0">
              <p className="text-base font-semibold text-tinta">{p.fullName}</p>
              <p className="text-sm text-tinta-suave">
                <span className="tabular whitespace-nowrap">Cédula {p.idNumber}</span>
                {p.isHolder ? " · Titular de la reserva" : null}
              </p>
            </div>
            {noViaja || !mostrarAbordaje ? null : (
              <div className="flex flex-wrap gap-2">
                <AbordajeBadge estado={p.estado} boardedAt={p.boardedAt} ahora={ahora} embarqueIniciado={embarqueIniciado} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </li>
  );
}

/** Pastilla de abordaje de un pasajero, con la hora a la que subió. */
function AbordajeBadge({
  estado,
  boardedAt,
  ahora,
  embarqueIniciado,
}: {
  estado: PassengerBoardingState;
  boardedAt: Date | null;
  ahora: Date;
  embarqueIniciado: boolean;
}) {
  const { label, tone } = boardingBadge(estado, embarqueIniciado);
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
