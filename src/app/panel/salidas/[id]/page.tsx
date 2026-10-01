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
import { prisma } from "@/lib/prisma";
import { errorMessage, okMessage } from "../../_dashboard/search-params";
import { CompactFigures } from "../../_shared/compact-figures";
import { departureWhenText, plural } from "../../_shared/day-label";
import { departureNotice } from "../../_shared/departure-notice";
import { arrowRouteName } from "../../_shared/route-text";
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

/** Texto del desplegable de quienes no viajan, el mismo en el teléfono y en la tabla. */
function noViajanResumen(cuantos: number): string {
  return cuantos === 1 ? "Ver el pasajero que no viaja" : `Ver los ${cuantos} pasajeros que no viajan`;
}

function noViajaLabel(reservationStatus: string): string {
  return NO_VIAJA_LABELS[reservationStatus] ?? "No viaja";
}

/**
 * Frase que resume la lista de pasajeros. Cuenta solo a los que viajan (a
 * bordo o por abordar), para que coincida con "pasajeros esperados" de las
 * cifras; los que no viajan se nombran aparte porque van al final.
 */
function pasajerosDescripcion(
  pasajeros: ReadonlyArray<{ estado: PassengerBoardingState; code: string }>,
  embarqueIniciado: boolean,
): string {
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
  // Antes del embarque faltan todos por subir: la lista va ordenada por pago.
  const orden = embarqueIniciado
    ? "Primero los que faltan por subir."
    : "Primero los que todavía deben dinero o esperan la revisión de su pago.";
  return `${plural(viajan.length, "pasajero", "pasajeros")} en ${plural(reservas, "reserva", "reservas")}. ${orden}${extra}`;
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
        : "Cobra lo que falta y revisa los comprobantes";
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
  /** Nombre del titular de su reserva, para decir con quién viaja un acompañante. */
  holderName: string | null;
  reservationId: string;
  code: string;
  reservationStatus: string;
  boardedAt: Date | null;
  estado: PassengerBoardingState;
}

/** Pasajeros seguidos de una misma reserva y situación, para la lista del teléfono. */
interface GrupoReserva {
  key: string;
  reservationId: string;
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
        reservationId: p.reservationId,
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
  // Comprobantes por revisar de esta salida (la salida ya es de la agencia de
  // la sesión), para abrir cada uno directo desde su reserva: la cola "Por
  // revisar" de Pasajeros y pagos es de toda la agencia.
  const comprobantes = await prisma.paymentProof.findMany({
    where: { status: "PENDIENTE", reservation: { departureId: salida.id, departure: { route: { agencyId } } } },
    select: { id: true, reservationId: true },
    orderBy: { createdAt: "asc" },
  });
  const comprobantePorReserva = new Map<string, string>();
  for (const c of comprobantes) {
    if (!comprobantePorReserva.has(c.reservationId)) comprobantePorReserva.set(c.reservationId, c.id);
  }

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
    .flatMap((r) => {
      const titular = r.passengers.find((p) => p.isHolder)?.fullName ?? null;
      return r.passengers.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        idNumber: p.idNumber,
        isHolder: p.isHolder,
        holderName: titular,
        reservationId: r.id,
        code: r.code,
        reservationStatus: r.status,
        boardedAt: p.boardedAt,
        estado: passengerBoardingState(r.status, p.boardedAt),
      }));
    })
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
  const hayAvisoPago = debenDinero > 0 || esperanRevision > 0;
  // La cola "Por revisar" es de toda la agencia (no se filtra por salida), así
  // que no se enlaza: con un solo comprobante el aviso lo abre directo, y con
  // varios cada reserva de la lista lleva su enlace «Revisar comprobante».
  // Solo mientras la salida no parte: después esas reservas ya se cancelaron.
  const revisarDe = (g: GrupoReserva): string | undefined =>
    antesDeSalir && g.estado === "por-abordar" ? comprobantePorReserva.get(g.reservationId) : undefined;
  const conComprobante = new Set(gruposViajan.map(revisarDe).filter((v): v is string => v !== undefined));
  const unicoComprobante = conComprobante.size === 1 ? [...conComprobante][0] : undefined;
  // Antes de iniciar el embarque todos están "Por abordar": la columna y las
  // pastillas no dirían nada que la cifra "Por abordar" no diga ya.
  const mostrarAbordaje = embarqueIniciado || resumen.boarded > 0;

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader
        back={{ href: "/panel/salidas", label: "Volver a salidas" }}
        title={arrowRouteName(salida.route.name)}
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
              description={<ConsecuenciasEmbarque resumen={resumen} />}
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
        description={pasajeros.length > 0 ? pasajerosDescripcion(pasajeros, embarqueIniciado) : undefined}
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
            {hayAvisoPago ? (
              // Los botones van debajo del texto y no en `action`: al lado, en
              // la tableta, dejaban el texto en una columna estrecha.
              <Alert tone="alerta" role="none" className="mb-5">
                <p>
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
                  {esperanRevision > 0 && conComprobante.size > 1
                    ? " Ábrelos con «Revisar comprobante» en cada reserva de la lista."
                    : null}
                </p>
                {debenDinero > 0 || (esperanRevision > 0 && conComprobante.size <= 1) ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {/* La lista "Por cobrar" cuenta reservas (también las de pago
                        en taquilla), así que el botón nombra lo que abre. */}
                    {debenDinero > 0 ? (
                      <Link href={porCobrarHref} className={panelButtonClass("secundario")}>
                        Ver las reservas por cobrar
                      </Link>
                    ) : null}
                    {esperanRevision > 0 && unicoComprobante ? (
                      <Link href={revisarHref(unicoComprobante)} className={panelButtonClass("secundario")}>
                        Revisar el comprobante
                      </Link>
                    ) : esperanRevision > 0 && conComprobante.size === 0 ? (
                      // Sin el comprobante a mano (caso raro), queda la cola de la agencia.
                      <Link href="/panel/pasajeros?vista=por-revisar" className={panelButtonClass("secundario")}>
                        Revisar los comprobantes de la agencia
                      </Link>
                    ) : null}
                  </div>
                ) : null}
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
                      revisarProofId={revisarDe(g)}
                    />
                  ))}
                </ul>
              ) : null}
              {gruposNoViajan.length > 0 ? (
                <details className="group rounded-control border border-borde">
                  <summary className="foco flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-control px-4 py-2 text-base font-semibold text-marca-700 [&::-webkit-details-marker]:hidden">
                    {noViajanResumen(cuantosNoViajan)}
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
                robaba el relleno de la tarjeta). Igual que en el teléfono, solo
                lista a quienes viajan, agrupados por reserva: el código y el
                pago se ven en la primera fila de cada reserva; quienes no
                viajan quedan plegados debajo. */}
            <div className="hidden flex-col gap-5 md:flex">
              {gruposViajan.length > 0 ? (
                <div
                  className={cx(
                    "-mx-5 overflow-x-auto",
                    !hayAvisoPago && "-mt-5",
                    gruposNoViajan.length === 0 ? "-mb-5" : "border-b border-borde",
                  )}
                >
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
                      {gruposViajan.map((g, gi) =>
                        g.pasajeros.map((p, i) => {
                          const primera = i === 0;
                          return (
                            <tr
                              key={p.id}
                              // Una línea más marcada abre cada reserva.
                              className={cx(
                                "border-b border-borde last:border-0",
                                primera && gi > 0 && "border-t-2 border-t-borde-control/40",
                              )}
                            >
                              <td className={PANEL_TD_CLASS}>
                                <p className="font-semibold">{p.fullName}</p>
                                <p className="text-sm text-tinta-suave">{companionText(p)}</p>
                              </td>
                              <td className={cx(PANEL_TD_CLASS, "tabular")}>{p.idNumber}</td>
                              {/* El código y el pago van una vez por reserva; en las
                                  demás filas quedan solo para el lector de pantalla. */}
                              <td className={cx(PANEL_TD_CLASS, "tabular whitespace-nowrap")}>
                                {primera ? g.code : <span className="sr-only">{g.code}</span>}
                              </td>
                              <td className={PANEL_TD_CLASS}>
                                {primera ? (
                                  <div className="flex flex-col items-start gap-1.5 [&>span]:whitespace-nowrap!">
                                    <StatusBadge
                                      label={reservationStatusLabel(g.reservationStatus)}
                                      tone={reservationStatusTone(g.reservationStatus)}
                                    />
                                    <RevisarComprobanteLink proofId={revisarDe(g)} />
                                  </div>
                                ) : (
                                  <>
                                    <span className="sr-only">{reservationStatusLabel(g.reservationStatus)}</span>
                                    <span aria-hidden="true" className="text-sm text-tinta-tenue">
                                      Misma reserva
                                    </span>
                                  </>
                                )}
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
                            </tr>
                          );
                        }),
                      )}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {gruposNoViajan.length > 0 ? (
                <details className="group rounded-control border border-borde">
                  <summary className="foco flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-control px-4 py-2 text-base font-semibold text-marca-700 [&::-webkit-details-marker]:hidden">
                    {noViajanResumen(cuantosNoViajan)}
                    <IconChevronDown className="size-5 shrink-0 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" />
                  </summary>
                  <div className="overflow-x-auto border-t border-borde">
                    <table className="w-full min-w-[640px]">
                      <thead className="border-b border-borde bg-lienzo">
                        <tr>
                          <th scope="col" className={PANEL_TH_CLASS}>Pasajero</th>
                          <th scope="col" className={PANEL_TH_CLASS}>Cédula</th>
                          <th scope="col" className={PANEL_TH_CLASS}>Código de reserva</th>
                          <th scope="col" className={PANEL_TH_CLASS}>Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gruposNoViajan.flatMap((g) =>
                          g.pasajeros.map((p) => (
                            <tr key={p.id} className="border-b border-borde last:border-0">
                              <td className={cx(PANEL_TD_CLASS, "font-semibold")}>{p.fullName}</td>
                              <td className={cx(PANEL_TD_CLASS, "tabular")}>{p.idNumber}</td>
                              <td className={cx(PANEL_TD_CLASS, "tabular whitespace-nowrap")}>{g.code}</td>
                              <td className={cx(PANEL_TD_CLASS, "[&>span]:whitespace-nowrap!")}>
                                <StatusBadge label={noViajaLabel(g.reservationStatus)} tone="neutro" />
                              </td>
                            </tr>
                          )),
                        )}
                      </tbody>
                    </table>
                  </div>
                </details>
              ) : null}
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
  revisarProofId,
  plegado = false,
}: {
  grupo: GrupoReserva;
  ahora: Date;
  embarqueIniciado: boolean;
  /** Comprobante por revisar de la reserva, si lo hay: se enlaza junto a la pastilla. */
  revisarProofId?: string;
  /** Antes del embarque no se pinta la pastilla "Por abordar" de cada pasajero. */
  mostrarAbordaje: boolean;
  plegado?: boolean;
}) {
  const noViaja = grupo.estado === "no-viaja";
  return (
    <li className={cx("flex flex-col gap-3 py-4", !plegado && "first:pt-0 last:pb-0")}>
      {/* La pastilla va siempre en su propio renglón bajo el código, para
          que todas las reservas tengan la misma forma sea cual sea su largo. */}
      <div className="flex flex-col items-start gap-2">
        <p className="min-w-0">
          <span className="block text-sm text-tinta-suave">Código de reserva</span>
          <span className="tabular block text-[15px] font-semibold text-tinta">{grupo.code}</span>
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {noViaja ? (
            <StatusBadge label={noViajaLabel(grupo.reservationStatus)} tone="neutro" />
          ) : (
            <StatusBadge
              label={reservationStatusLabel(grupo.reservationStatus)}
              tone={reservationStatusTone(grupo.reservationStatus)}
            />
          )}
          <RevisarComprobanteLink proofId={revisarProofId} />
        </div>
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

/** Revisión de un comprobante en Pasajeros y pagos, en su panel lateral. */
function revisarHref(proofId: string): string {
  return `/panel/pasajeros?vista=por-revisar&comprobante=${proofId}`;
}

/** Enlace a la revisión del comprobante de una reserva, o nada si no tiene uno pendiente. */
function RevisarComprobanteLink({ proofId }: { proofId: string | undefined }) {
  if (!proofId) return null;
  return (
    <Link
      href={revisarHref(proofId)}
      className="foco inline-flex min-h-11 items-center rounded-control text-sm font-semibold text-marca-700 underline underline-offset-4 hover:text-marca-800 md:min-h-0"
    >
      Revisar comprobante
    </Link>
  );
}

/**
 * Línea bajo el nombre en la tabla: el titular lo dice y cada acompañante
 * dice con quién viaja, para que sus celdas de reserva vacías no se lean como
 * "sin pago".
 */
function companionText(p: PasajeroFila): string {
  if (p.isHolder) return "Titular de la reserva";
  return p.holderName ? `Viaja con ${p.holderName}` : "Acompañante";
}

/**
 * Qué pasa al iniciar el embarque: una frase corta y, en lista con las cifras
 * en negrita, a quiénes hay que atender antes de registrar la salida, igual
 * que el diálogo de registrar la salida.
 */
function ConsecuenciasEmbarque({ resumen }: { resumen: ManifestSummary }) {
  const deben = resumen.owingPassengers;
  const revisar = resumen.reviewPassengers;
  return (
    <div className="flex flex-col gap-2">
      <p>Se cierra la venta de esta salida: ya no se podrán vender pasajes.</p>
      <p>
        {resumen.expected > 0 ? (
          <>
            Hay{" "}
            <strong className="font-semibold text-tinta">
              {plural(resumen.expected, "pasajero", "pasajeros")} con reserva
            </strong>
            .
          </>
        ) : (
          "Todavía no hay pasajeros con reserva."
        )}
      </p>
      {deben > 0 || revisar > 0 ? (
        <>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {deben > 0 ? (
              <li>
                <strong className="font-semibold text-tinta">{plural(deben, "pasajero", "pasajeros")}</strong> todavía{" "}
                {deben === 1 ? "debe" : "deben"} dinero.
              </li>
            ) : null}
            {revisar > 0 ? (
              <li>
                <strong className="font-semibold text-tinta">{plural(revisar, "pasajero", "pasajeros")}</strong>{" "}
                {revisar === 1 ? "espera" : "esperan"} la revisión de su comprobante.
              </li>
            ) : null}
          </ul>
          <p>{atencionAccion(resumen)}</p>
        </>
      ) : null}
    </div>
  );
}
