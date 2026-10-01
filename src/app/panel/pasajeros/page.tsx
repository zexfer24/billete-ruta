import { Suspense } from "react";
import Link from "next/link";
import { ForbiddenError, requireAgencyUser } from "@/modules/auth";
import { listAgencyDepartures } from "@/modules/catalog";
import {
  countAgencyReservationViews,
  getAgencyReservationDetail,
  RESERVATION_VIEWS,
} from "@/modules/reports";
import type { ReservationView } from "@/modules/reports";
import type { AgencyDepartureRow } from "@/modules/catalog";
import { countPendingProofs, getProofReview } from "@/modules/payments";
import { formatCaracasDateTime24 } from "@/lib/time";
import { SidePanel } from "@/components/side-panel";
import { PanelFeedback } from "@/components/panel-feedback";
import { PANEL_LABEL_CLASS, PanelPageHeader, panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { IconCash, IconChevronDown, IconDownload, IconSearch } from "@/components/icons";
import { CashPaymentForm } from "@/app/panel/_forms/cash-payment-form";
import { errorMessage, firstParam, okMessage, type RawSearchParam } from "../_dashboard/search-params";
import { panelFeedbackUrl } from "../feedback";
import { ProofNotFound, ProofReviewPanel } from "./proof-review";
import { ReservationDetailPanel, ReservationNotFound } from "./reservation-detail";
import { ProofQueueList, ReservationList } from "./passenger-list";
import { ListSkeleton, PanelBodySkeleton } from "./skeletons";
import { arrowRouteName } from "./trip-text";
// Formulario GET con espera (`next/form`), el mismo que el filtro de Reportes
// (period-bar.tsx).
import { GetForm, GetSubmitButton } from "../_shared/get-form";
import { parsePasajerosFilters, uuidParam } from "./filters";
import { pasajerosUrl } from "./urls";
import { ViewTabs } from "./view-tabs";
import { LinkPendingIcon } from "./link-pending";

export const metadata = { title: "Pasajeros y pagos" };

/** Traduce el código corto de `?ok=` a un texto. Un código desconocido no muestra nada. */
const OK_LABELS: Record<string, string> = {
  aprobado: "Pago aprobado. Si con este pago la reserva quedó completa, el ticket ya se emitió.",
  rechazado: "Comprobante rechazado. El pasajero verá el motivo y podrá enviar otro.",
  cobro: "Cobro registrado.",
  "cobro-ticket": "Cobro registrado. El saldo quedó en cero y se emitió el ticket.",
};

/**
 * Nombre de cada pestaña en lenguaje llano. "Sin efecto" (el nombre interno
 * de la vista) se muestra como "Anuladas".
 */
const VIEW_TAB_LABELS: Record<ReservationView, string> = {
  "por-revisar": "Por revisar",
  "por-cobrar": "Por cobrar",
  pagadas: "Pagadas",
  "sin-efecto": "Anuladas",
  todas: "Todas",
};

/** Qué muestra cada pestaña, en una frase, debajo de las pestañas. */
const VIEW_DESCRIPTIONS: Record<ReservationView, string> = {
  "por-revisar": "Comprobantes de pago que enviaron los pasajeros, primero los de la salida más próxima.",
  "por-cobrar": "Reservas que todavía deben dinero, ordenadas por la salida más próxima.",
  pagadas: "Reservas pagadas por completo, con su ticket emitido.",
  "sin-efecto": "Reservas liberadas, canceladas o de pasajeros que no se presentaron.",
  todas: "Todas las reservas de tu agencia, de la más nueva a la más antigua.",
};

/**
 * Filtros de las vistas de reservas (salida y búsqueda). Van dentro del mismo
 * `<Suspense>` que la lista: la lista de salidas del selector no retrasa la
 * cabecera ni las pestañas, y los filtros llegan junto con los datos.
 */
async function ReservationFilters({
  vista,
  salida,
  buscar,
  departures,
}: {
  vista: ReservationView;
  salida?: string;
  buscar?: string;
  departures: Promise<AgencyDepartureRow[]>;
}) {
  const salidas = await departures;
  const salidaFueraDeLista = salida !== undefined && !salidas.some((d) => d.id === salida);
  const hayFiltros = Boolean(salida || buscar);

  // El landmark de búsqueda lleva nombre ("Filtrar reservas"): `GetForm` no
  // reenvía `aria-label`, así que el rol va en el contenedor.
  return (
    <div role="search" aria-label="Filtrar reservas">
      <GetForm
        action="/panel/pasajeros"
        className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1 md:flex-row md:flex-wrap md:items-end"
      >
        <input type="hidden" name="vista" value={vista} />
        <label className={`${PANEL_LABEL_CLASS} md:w-80`}>
          Salida
          <span className="relative">
            <select
              name="salida"
              defaultValue={salida ?? ""}
              className={panelInputClass("cursor-pointer appearance-none pr-10")}
            >
              <option value="">Cualquier salida</option>
              {salidaFueraDeLista ? <option value={salida}>La salida elegida en el enlace</option> : null}
              {salidas.map((d) => (
                <option key={d.id} value={d.id}>
                  {arrowRouteName(d.routeName)} · {formatCaracasDateTime24(d.departsAt)}
                </option>
              ))}
            </select>
            <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-tinta-suave" />
          </span>
        </label>
        <label className={`${PANEL_LABEL_CLASS} md:min-w-64 md:flex-1`}>
          Buscar
          <input
            type="search"
            name="buscar"
            defaultValue={buscar ?? ""}
            maxLength={80}
            placeholder="Nombre, cédula o código"
            className={panelInputClass()}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <GetSubmitButton pendingLabel="Buscando…" className={panelButtonClass("secundario")}>
            <IconSearch className="size-5" />
            Buscar
          </GetSubmitButton>
          {hayFiltros ? (
            <Link href={pasajerosUrl({ vista })} className={panelButtonClass("fantasma")}>
              Quitar los filtros
            </Link>
          ) : null}
        </div>
      </GetForm>
    </div>
  );
}

/** Panel lateral de detalle de reserva: se carga dentro de su `<Suspense>`. */
async function ReservationPanelContent({
  reservationId,
  agencyId,
  hidden,
  error,
  ok,
  closeHref,
}: {
  reservationId: string;
  agencyId: string;
  hidden: Record<string, string>;
  error?: string;
  ok?: string;
  closeHref: string;
}) {
  const detail = await getAgencyReservationDetail(reservationId, agencyId).catch((e: unknown) => {
    if (e instanceof ForbiddenError) return null;
    throw e;
  });
  if (!detail) return <ReservationNotFound closeHref={closeHref} />;
  return (
    <ReservationDetailPanel
      detail={detail}
      hidden={{ ...hidden, reservaId: detail.reservation.id }}
      error={error}
      ok={ok}
    />
  );
}

/** Panel lateral de revisión de comprobante: se carga dentro de su `<Suspense>`. */
async function ProofPanelContent({
  proofId,
  agencyId,
  hidden,
  error,
  closeHref,
}: {
  proofId: string;
  agencyId: string;
  hidden: Record<string, string>;
  error?: string;
  closeHref: string;
}) {
  const review = await getProofReview(proofId, agencyId).catch((e: unknown) => {
    if (e instanceof ForbiddenError) return null;
    throw e;
  });
  if (!review) return <ProofNotFound closeHref={closeHref} />;
  return <ProofReviewPanel review={review} hidden={hidden} error={error} />;
}

/**
 * "Pasajeros y pagos" (spec 7.2): pestañas con contador, filtros, la lista
 * (tabla en escritorio, tarjetas en pantallas angostas) y el detalle en un
 * panel lateral. La cabecera y las pestañas esperan solo los contadores; los
 * filtros con la lista y el panel lateral cargan dentro de su propio
 * `<Suspense>`. Como un cambio de pestaña, filtro o página solo cambia los
 * `searchParams`, la pantalla anterior sigue visible hasta que llega la
 * nueva: la pestaña pulsada lo indica al instante (`ViewTabs`), y lo mismo
 * el enlace o la fila que abre un panel lateral (`LinkPendingIcon`).
 */
export default async function PasajerosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, RawSearchParam>>;
}) {
  const { agencyId } = await requireAgencyUser("payments.review");
  const params = await searchParams;

  const filtros = parsePasajerosFilters(params);
  const { salida, buscar, pagina } = filtros;
  const registrarCobro = firstParam(params.registrar) === "cobro";
  const reservaId = uuidParam(params.reserva);
  const comprobanteId = uuidParam(params.comprobante);
  const okCode = firstParam(params.ok);
  const ok = okMessage(OK_LABELS, params.ok);
  const error = errorMessage(params.error);

  const pendientesP = countPendingProofs(agencyId);
  const conteosP = countAgencyReservationViews(agencyId, { departureId: salida, search: buscar });
  // Evita el aviso de rechazo sin manejar mientras se espera la primera consulta.
  conteosP.catch(() => undefined);

  // Sin vista en la URL (por ejemplo, desde el menú con su insignia), se abre
  // "Por revisar" si hay comprobantes esperando; si no, "Todas".
  const pendientes = await pendientesP;
  const vista: ReservationView = filtros.vista ?? (pendientes > 0 ? "por-revisar" : "todas");
  const esPorRevisar = vista === "por-revisar";
  // Las salidas del selector solo hacen falta en las vistas con filtros, y
  // las espera `ReservationFilters` dentro de su `<Suspense>`.
  const salidasP = esPorRevisar
    ? null
    : listAgencyDepartures(agencyId, { from: new Date(Date.now() - 30 * 24 * 3_600_000), order: "desc" });
  salidasP?.catch(() => undefined);
  const conteos = await conteosP;

  const panelAbierto = registrarCobro || Boolean(reservaId) || Boolean(comprobanteId);

  const hiddenFiltros: Record<string, string> = { vista };
  if (pagina > 1) hiddenFiltros.pagina = String(pagina);
  if (salida) hiddenFiltros.salida = salida;
  if (buscar) hiddenFiltros.buscar = buscar;

  const closeHref = pasajerosUrl({ vista, salida, buscar, pagina });
  const exportHref = panelFeedbackUrl("/panel/pasajeros/exportar", { vista, salida, buscar });
  const listKey = [vista, salida ?? "", buscar ?? "", pagina].join("|");

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader
        title="Pasajeros y pagos"
        description="Revisa los comprobantes que envían los pasajeros, cobra lo que falta y consulta cada reserva."
        actions={
          <>
            <Link
              href={pasajerosUrl({ vista, salida, buscar, pagina, registrar: "cobro" })}
              scroll={false}
              className={panelButtonClass("secundario", "md", "relative")}
            >
              <LinkPendingIcon icon={<IconCash className="size-5" />} />
              Registrar un cobro
            </Link>
            {/* Enlace normal (no `Link`): es una descarga y no debe precargarse. */}
            <a href={exportHref} className={panelButtonClass("fantasma")}>
              <IconDownload className="size-5" />
              Descargar en Excel (CSV)
            </a>
          </>
        }
      />

      {/* Con un panel lateral abierto, el aviso se muestra dentro del panel. */}
      <PanelFeedback ok={panelAbierto ? undefined : ok} error={panelAbierto ? undefined : error} />

      <div className="flex flex-col gap-3">
        <ViewTabs
          label="Situación de las reservas"
          tabs={RESERVATION_VIEWS.map((v) => ({
            href: pasajerosUrl({ vista: v, salida, buscar }),
            label: VIEW_TAB_LABELS[v],
            count: v === "por-revisar" ? pendientes : conteos[v],
            active: v === vista,
          }))}
        />
        <p className="text-[15px] text-tinta-suave">{VIEW_DESCRIPTIONS[vista]}</p>
      </div>

      <Suspense key={listKey} fallback={<ListSkeleton filters={!esPorRevisar} variant={esPorRevisar ? "comprobantes" : "reservas"} />}>
        {esPorRevisar || !salidasP ? (
          <ProofQueueList agencyId={agencyId} page={pagina} selectedProofId={comprobanteId} okCode={okCode} />
        ) : (
          <div className="flex flex-col gap-6">
            <ReservationFilters vista={vista} salida={salida} buscar={buscar} departures={salidasP} />
            <ReservationList
              agencyId={agencyId}
              vista={vista}
              salida={salida}
              buscar={buscar}
              page={pagina}
              selectedReservationId={reservaId}
              okCode={okCode}
            />
          </div>
        )}
      </Suspense>

      {registrarCobro ? (
        // Sin subtítulo: el formulario ya explica los dos pasos (buscar la
        // reserva y luego cobrar) y no conviene decirlo dos veces.
        <SidePanel title="Registrar un cobro en efectivo" closeHref={closeHref}>
          <CashPaymentForm mode="codigo" hidden={hiddenFiltros} error={error} />
        </SidePanel>
      ) : reservaId ? (
        <SidePanel title="Detalle de la reserva" closeHref={closeHref}>
          <Suspense key={reservaId} fallback={<PanelBodySkeleton />}>
            <ReservationPanelContent
              reservationId={reservaId}
              agencyId={agencyId}
              hidden={hiddenFiltros}
              error={error}
              ok={ok}
              closeHref={closeHref}
            />
          </Suspense>
        </SidePanel>
      ) : comprobanteId ? (
        <SidePanel title="Revisar comprobante" closeHref={closeHref}>
          <Suspense key={comprobanteId} fallback={<PanelBodySkeleton />}>
            <ProofPanelContent
              proofId={comprobanteId}
              agencyId={agencyId}
              hidden={hiddenFiltros}
              error={error}
              closeHref={closeHref}
            />
          </Suspense>
        </SidePanel>
      ) : null}
    </div>
  );
}
