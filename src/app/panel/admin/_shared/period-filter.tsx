import type { ReactNode } from "react";
import { IconCalendar } from "@/components/icons";
import { PANEL_LABEL_CLASS, panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { AdminTabs } from "./admin-tabs";
import { ADMIN_TABS_BESIDE_TITLE_CLASS, ADMIN_TITLE_ROW_CLASS } from "./tab-classes";
import { GetForm, GetSubmitButton } from "@/app/panel/_shared/get-form";
import { describeAdminRange, periodQuery, periodTabs, type AdminRange } from "./period";

/** Botón del formulario cuando solo trae otros filtros (la agencia), en singular. */
export const FILTER_BUTTON_LABEL = "Filtrar";

/**
 * Selector de periodo del administrador: pestañas (Últimas 24 horas, 7 días,
 * 30 días, Otras fechas), el formulario de fechas cuando se eligió "Otras
 * fechas" y el rango aplicado en palabras. Es un formulario GET: no escribe
 * nada, solo cambia la URL. Con `GetForm` (`next/form`) la navegación es
 * del lado del cliente: el botón muestra "Buscando…" y la zona de datos, su
 * silueta.
 *
 * `extraFields` agrega otros filtros al mismo formulario (por ejemplo la
 * agencia); con ellos el formulario se muestra siempre. `keep` son esos mismos
 * filtros ya aplicados, para conservarlos al cambiar de pestaña. Con
 * `autoSubmit`, esos campos se aplican solos al cambiar (como las pestañas) y
 * el botón "Filtrar" queda solo para quien navega sin JavaScript; en "Otras
 * fechas" el botón sigue visible, porque las fechas se aplican con él.
 *
 * Con `title`, las pestañas van a la derecha de un título de sección (`h2`),
 * como "Resumen de hoy" en el tablero de la agencia, y el rango queda debajo
 * como detalle.
 */
export function PeriodFilter({
  path,
  range,
  keep = {},
  extraFields,
  caption,
  title,
  autoSubmit = false,
}: {
  path: string;
  range: AdminRange;
  keep?: Record<string, string | undefined>;
  extraFields?: ReactNode;
  /** Los `extraFields` envían el formulario al cambiar (ver arriba). */
  autoSubmit?: boolean;
  /** Qué abarca el periodo, por ejemplo "Recorridos, usuarios nuevos y gráfico". */
  caption?: string;
  /** Título de sección con las pestañas a su derecha; `id` para `aria-labelledby`. */
  title?: { text: string; id: string };
}) {
  const tabTargets = periodTabs(path, range, keep).map(({ href, label, active }) => ({ href, label, active }));
  const isCustom = range.period === "fechas";
  const showForm = isCustom || Boolean(extraFields);
  // Fuera de "Otras fechas", el formulario de filtros conserva el periodo en campos ocultos.
  const hiddenPeriod = isCustom ? { periodo: "fechas" } : periodQuery(range);

  return (
    <div className="flex flex-col gap-3">
      {title ? (
        <div className={ADMIN_TITLE_ROW_CLASS}>
          <h2 id={title.id} className="text-lg font-semibold text-tinta">
            {title.text}
          </h2>
          <AdminTabs label="Periodo" grid className={ADMIN_TABS_BESIDE_TITLE_CLASS} tabs={tabTargets} />
        </div>
      ) : (
        <AdminTabs label="Periodo" grid tabs={tabTargets} />
      )}

      {showForm ? (
        <GetForm
          action={path}
          className="flex flex-wrap items-end gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1"
        >
          {Object.entries(hiddenPeriod).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          {!extraFields
            ? Object.entries(keep).map(([name, value]) =>
                value ? <input key={name} type="hidden" name={name} value={value} /> : null,
              )
            : null}
          {isCustom ? (
            <>
              <label className={`${PANEL_LABEL_CLASS} min-w-40 flex-1 sm:flex-none`}>
                Desde
                <input
                  type="date"
                  name="from"
                  required
                  defaultValue={range.fromInput}
                  className={panelInputClass("sm:w-48")}
                />
              </label>
              <label className={`${PANEL_LABEL_CLASS} min-w-40 flex-1 sm:flex-none`}>
                Hasta
                <input
                  type="date"
                  name="to"
                  required
                  defaultValue={range.toInput}
                  className={panelInputClass("sm:w-48")}
                />
              </label>
            </>
          ) : null}
          {extraFields}
          {autoSubmit && extraFields && !isCustom ? (
            // Respaldo sin JavaScript: con él, la lista ya se aplica al elegir.
            <noscript>
              <button type="submit" className={panelButtonClass("secundario", "md")}>
                {FILTER_BUTTON_LABEL}
              </button>
            </noscript>
          ) : (
            // Con un solo filtro y sin fechas, el botón corto queda en la misma
            // fila que la lista en el teléfono, para no empujar la lista de viajes.
            <GetSubmitButton
              pendingLabel="Buscando…"
              className={panelButtonClass(
                extraFields ? "secundario" : "primario",
                "md",
                extraFields && !isCustom ? undefined : "w-full sm:w-auto",
              )}
            >
              {extraFields ? FILTER_BUTTON_LABEL : "Ver estas fechas"}
            </GetSubmitButton>
          )}
        </GetForm>
      ) : null}

      <p className="flex items-start gap-2 text-sm leading-snug text-tinta-suave">
        <IconCalendar className="mt-px size-4 shrink-0" />
        <span>
          {caption ? <span className="font-semibold text-tinta">{caption}: </span> : null}
          {describeAdminRange(range)}.
        </span>
      </p>
    </div>
  );
}
