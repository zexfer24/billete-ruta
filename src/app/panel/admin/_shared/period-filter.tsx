import type { ReactNode } from "react";
import { IconCalendar } from "@/components/icons";
import { PANEL_LABEL_CLASS, panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { AdminTabs } from "./admin-tabs";
import { GetForm, GetSubmitButton } from "./get-form";
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
 * filtros ya aplicados, para conservarlos al cambiar de pestaña.
 */
export function PeriodFilter({
  path,
  range,
  keep = {},
  extraFields,
  caption,
}: {
  path: string;
  range: AdminRange;
  keep?: Record<string, string | undefined>;
  extraFields?: ReactNode;
  /** Qué abarca el periodo, por ejemplo "Recorridos, usuarios nuevos y gráfico". */
  caption?: string;
}) {
  const tabs = periodTabs(path, range, keep);
  const isCustom = range.period === "fechas";
  const showForm = isCustom || Boolean(extraFields);
  // Fuera de "Otras fechas", el formulario de filtros conserva el periodo en campos ocultos.
  const hiddenPeriod = isCustom ? { periodo: "fechas" } : periodQuery(range);

  return (
    <div className="flex flex-col gap-3">
      <AdminTabs label="Periodo" grid tabs={tabs.map(({ href, label, active }) => ({ href, label, active }))} />

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
          {/* Con un solo filtro y sin fechas, el botón corto queda en la misma
              fila que la lista en el teléfono, para no empujar la lista de viajes. */}
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
