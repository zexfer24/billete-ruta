import { Fragment } from "react";
import Link from "next/link";
import { listAgencyDepartures, listRoutes } from "@/modules/catalog";
import type { AgencyDepartureRow } from "@/modules/catalog";
import { listDrivers, listVehicles } from "@/modules/agencies";
import { formatCaracasTime24 } from "@/lib/time";
import { departureStatusLabel, departureStatusTone } from "@/lib/labels";
import { SidePanel } from "@/components/side-panel";
import { IconBus, IconCalendar, IconChevronRight } from "@/components/icons";
import {
  EmptyState,
  PANEL_TD_CLASS,
  PANEL_TH_CLASS,
  ProgressBar,
  StatusBadge,
  TableShell,
  panelButtonClass,
} from "@/components/panel-ui";
import type { ProgressTone } from "@/components/ui-classes";
import { cx } from "@/components/ui-classes";
import { DepartureForm } from "../_forms/departure-form";
import { groupByCaracasDay, plural } from "../_shared/day-label";
import { departureNotice } from "../_shared/departure-notice";
import { DepartureNoticeText } from "../_shared/departure-notice-text";
import { routeSubtitle } from "../_shared/route-text";
import { inTodayOrTomorrow, proximasHref } from "./links";

const HORA_MS = 3_600_000;
const DIA_MS = 24 * HORA_MS;

/** Tope de filas que devuelve `listAgencyDepartures`; si se alcanza, se avisa en pantalla. */
const TOPE_CONSULTA = 200;

/** Con esta cantidad de puestos libres o menos, la salida se marca "Casi llena". */
const CASI_LLENA_LIBRES = 4;

/**
 * Ocupación de una salida en palabras y con el tono de la barra: nunca solo el
 * color. El aviso "Casi llena" se decide por los puestos libres, no por el
 * porcentaje, para que la misma cifra reciba siempre el mismo color, y nunca
 * reemplaza la cifra: "Casi llena · 4 libres".
 */
function ocupacion(s: AgencyDepartureRow): { label: string; detail: string; tone: ProgressTone } {
  const label = `${s.occupied} de ${plural(s.capacity, "puesto", "puestos")}`;
  if (s.capacity > 0 && s.occupied >= s.capacity) return { label, detail: "Llena", tone: "peligro" };
  const libres = plural(s.available, "libre", "libres");
  if (s.capacity > 0 && s.available <= CASI_LLENA_LIBRES) return { label, detail: `Casi llena · ${libres}`, tone: "alerta" };
  return { label, detail: libres, tone: "marca" };
}

/**
 * Nombre de la ruta sin cortes feos: cada ciudad queda entera en su renglón
 * y el guion va pegado a la ciudad anterior, así nunca queda "–" solo en una
 * línea ni "San / Cristóbal".
 */
function RouteName({ name }: { name: string }) {
  const partes = name.split(/ ([–-]) /);
  const ciudades = partes.filter((_, i) => i % 2 === 0);
  const guiones = partes.filter((_, i) => i % 2 === 1);
  return (
    <>
      {ciudades.map((ciudad, i) => (
        <Fragment key={`${i}-${ciudad}`}>
          {i > 0 ? " " : null}
          <span className="whitespace-nowrap">
            {ciudad}
            {guiones[i] ? `\u00A0${guiones[i]}` : null}
          </span>
        </Fragment>
      ))}
    </>
  );
}

/**
 * Tarjeta de una salida en el teléfono: toda la tarjeta abre la hoja de la
 * salida. Forma fija para todas las tarjetas de la lista: la hora y la
 * pastilla de estado en la primera fila, el aviso de tiempo (si hay) y la
 * ruta debajo, sin importar lo largo que sea el nombre de la ruta.
 */
function DepartureCard({ s, ahora }: { s: AgencyDepartureRow; ahora: Date }) {
  const hora = formatCaracasTime24(s.departsAt);
  const puestos = ocupacion(s);
  const aviso = departureNotice(s, ahora);
  const subtitulo = routeSubtitle(s.routeName, s.origin, s.destination);
  return (
    <li>
      <Link
        href={`/panel/salidas/${s.id}`}
        className="foco flex flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1 transition-colors duration-150 ease-out hover:bg-marca-50 motion-reduce:transition-none"
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-3">
            <p className="tabular text-lg font-bold text-tinta">{hora}</p>
            <StatusBadge label={departureStatusLabel(s.status)} tone={departureStatusTone(s.status)} />
          </div>
          {aviso ? <DepartureNoticeText aviso={aviso} /> : null}
          <p className="text-base font-semibold text-tinta">
            <RouteName name={s.routeName} />
          </p>
          {subtitulo ? <p className="text-sm text-tinta-suave">{subtitulo}</p> : null}
        </div>
        <p className="text-sm text-tinta-suave">
          <span className="tabular font-semibold text-tinta">{s.vehiclePlate}</span> · {s.driverName}
        </p>
        <ProgressBar value={s.occupied} max={s.capacity} label={puestos.label} detail={puestos.detail} tone={puestos.tone} />
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-marca-700">
          Ver detalle
          <IconChevronRight className="size-4 shrink-0" />
        </span>
      </Link>
    </li>
  );
}

/**
 * Lista de salidas de la agencia agrupada por día ("Hoy", "Mañana",
 * "Jueves 02/10"): tabla en escritorio y tarjetas en el teléfono, con la
 * ocupación en una barra con texto y el estado en una pastilla. En
 * "Próximas" se muestran por defecto solo hoy y mañana; los días siguientes
 * quedan detrás de un enlace (`?dias=todos`) para no cargar la pantalla.
 */
export async function DeparturesList({
  agencyId,
  historial,
  todosLosDias,
  crearHref,
}: {
  agencyId: string;
  historial: boolean;
  todosLosDias: boolean;
  crearHref: string;
}) {
  const ahora = new Date();
  // Por defecto se muestra lo que viene, más las últimas 2 horas para terminar
  // el embarque de lo que está saliendo; el historial queda en su pestaña.
  const consultadas = await listAgencyDepartures(
    agencyId,
    historial
      ? { from: new Date(ahora.getTime() - 30 * DIA_MS), to: ahora, order: "desc" }
      : { from: new Date(ahora.getTime() - 2 * HORA_MS) },
  );
  const recortada = consultadas.length >= TOPE_CONSULTA;

  const salidas =
    historial || todosLosDias ? consultadas : consultadas.filter((s) => inTodayOrTomorrow(s.departsAt, ahora));
  const siguientes = consultadas.length - salidas.length;

  const verSiguientes =
    siguientes > 0 ? (
      <Link href={proximasHref({ todosLosDias: true })} className={panelButtonClass("secundario", "md", "w-full sm:w-fit")}>
        Ver los próximos días ({plural(siguientes, "salida más", "salidas más")})
      </Link>
    ) : null;

  if (salidas.length === 0) {
    if (historial) {
      return (
        <EmptyState
          icon={<IconCalendar />}
          title="No hubo viajes en los últimos 30 días"
          description="Aquí aparecen las salidas que ya partieron o se cancelaron."
          action={
            <Link href="/panel/salidas" className={panelButtonClass("secundario")}>
              Ver las próximas salidas
            </Link>
          }
        />
      );
    }
    if (verSiguientes) {
      return (
        <EmptyState
          icon={<IconCalendar />}
          title="No hay salidas hoy ni mañana"
          description="Tu agencia tiene salidas programadas para los días siguientes."
          action={verSiguientes}
        />
      );
    }
    return (
      <EmptyState
        icon={<IconBus />}
        title="No hay salidas programadas"
        description="Crea una salida para que los pasajeros puedan comprar pasajes en esa ruta."
        action={
          <Link href={crearHref} scroll={false} className={panelButtonClass("secundario")}>
            Crear una salida
          </Link>
        }
      />
    );
  }

  const grupos = groupByCaracasDay(salidas, (s) => s.departsAt, ahora);
  const resumen = historial
    ? `${plural(salidas.length, "viaje", "viajes")} de los últimos 30 días, del más reciente al más antiguo.`
    : `${plural(salidas.length, "salida", "salidas")} ${todosLosDias ? "desde hoy" : "hoy y mañana"}, incluidas las de las últimas 2 horas para que termines su embarque.`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-sm text-tinta-suave">
          {resumen}
          {recortada ? ` Se muestran las primeras ${TOPE_CONSULTA}.` : null}
        </p>
        {!historial && todosLosDias ? (
          <Link href={proximasHref({ todosLosDias: false })} className={panelButtonClass("fantasma", "md", "-mx-2 sm:mx-0")}>
            Ver solo hoy y mañana
          </Link>
        ) : null}
      </div>

      {grupos.map((grupo) => {
        const headingId = `salidas-${grupo.key}`;
        return (
          <section key={grupo.key} aria-labelledby={headingId} className="flex flex-col gap-3">
            <h2 id={headingId} className="flex items-baseline gap-2 text-lg font-semibold text-tinta">
              {grupo.heading}
              <span className="text-sm font-normal text-tinta-suave">
                {plural(grupo.items.length, "salida", "salidas")}
              </span>
            </h2>
            <TableShell
              mobile={
                <ul className="flex flex-col gap-3">
                  {grupo.items.map((s) => (
                    <DepartureCard key={s.id} s={s} ahora={ahora} />
                  ))}
                </ul>
              }
            >
              {/* Desde `xl` los anchos son fijos (`table-fixed` con `<colgroup>`):
                  así las columnas de "Hoy" y "Mañana" quedan alineadas de una
                  tabla a la otra. Por debajo, en la tableta, el ancho se reparte
                  según el contenido, porque seis columnas fijas no caben. */}
              <table className="w-full min-w-[760px] xl:table-fixed">
                <colgroup>
                  <col className="xl:w-20" />
                  <col />
                  <col className="xl:w-40" />
                  <col className="xl:w-44" />
                  <col className="xl:w-44" />
                  <col className="xl:w-36" />
                </colgroup>
                <thead className="border-b border-borde bg-lienzo">
                  <tr>
                    <th scope="col" className={cx(PANEL_TH_CLASS, "w-20")}>Hora</th>
                    <th scope="col" className={PANEL_TH_CLASS}>Ruta</th>
                    <th scope="col" className={cx(PANEL_TH_CLASS, "min-w-40")}>Vehículo y chofer</th>
                    <th scope="col" className={cx(PANEL_TH_CLASS, "w-44")}>Puestos</th>
                    <th scope="col" className={PANEL_TH_CLASS}>Estado</th>
                    <th scope="col" className={PANEL_TH_CLASS}>
                      <span className="sr-only">Acción</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.items.map((s) => {
                    const hora = formatCaracasTime24(s.departsAt);
                    const puestos = ocupacion(s);
                    const aviso = departureNotice(s, ahora);
                    const subtitulo = routeSubtitle(s.routeName, s.origin, s.destination);
                    return (
                      <tr key={s.id} className="border-b border-borde last:border-0">
                        <td className={PANEL_TD_CLASS}>
                          <p className="tabular text-lg font-bold">{hora}</p>
                        </td>
                        <td className={PANEL_TD_CLASS}>
                          <p className="font-semibold">
                            <RouteName name={s.routeName} />
                          </p>
                          {subtitulo ? <p className="text-sm text-tinta-suave">{subtitulo}</p> : null}
                        </td>
                        <td className={PANEL_TD_CLASS}>
                          <p className="tabular font-semibold">{s.vehiclePlate}</p>
                          <p className="text-sm text-tinta-suave">{s.driverName}</p>
                        </td>
                        <td className={PANEL_TD_CLASS}>
                          {/* El detalle va siempre debajo de la barra: todas las filas tienen la misma forma. */}
                          <ProgressBar value={s.occupied} max={s.capacity} label={puestos.label} tone={puestos.tone} />
                          <p className="tabular mt-1 text-sm text-tinta-suave">{puestos.detail}</p>
                        </td>
                        <td className={PANEL_TD_CLASS}>
                          <div className="flex flex-col items-start gap-1">
                            <StatusBadge label={departureStatusLabel(s.status)} tone={departureStatusTone(s.status)} />
                            {aviso ? <DepartureNoticeText aviso={aviso} /> : null}
                          </div>
                        </td>
                        <td className={cx(PANEL_TD_CLASS, "text-right")}>
                          <Link
                            href={`/panel/salidas/${s.id}`}
                            className={panelButtonClass("secundario", "sm", "whitespace-nowrap")}
                          >
                            Ver detalle
                            <span className="sr-only">
                              {" "}
                              de {s.routeName}, {grupo.heading.toLowerCase()} a las {hora}
                            </span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableShell>
          </section>
        );
      })}

      {!historial && verSiguientes ? <div>{verSiguientes}</div> : null}
    </div>
  );
}

/**
 * Panel lateral para crear una salida. Las rutas, los vehículos y los
 * choferes solo se consultan cuando el panel está abierto.
 */
export async function CreateDeparturePanel({
  agencyId,
  closeHref,
  error,
  errorField,
}: {
  agencyId: string;
  closeHref: string;
  error?: string;
  errorField?: string;
}) {
  const [rutas, vehiculos, choferes] = await Promise.all([
    listRoutes(agencyId),
    listVehicles(agencyId),
    listDrivers(agencyId),
  ]);

  return (
    <SidePanel
      title="Crear salida"
      subtitle="Elige la ruta, el vehículo, el chofer y cuándo sale."
      closeHref={closeHref}
    >
      <DepartureForm
        routes={rutas}
        vehicles={vehiculos.filter((v) => v.active)}
        drivers={choferes.filter((c) => c.active)}
        error={error}
        errorField={errorField}
      />
    </SidePanel>
  );
}
