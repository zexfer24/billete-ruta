import { DASHBOARD_PERIODS, DASHBOARD_PERIOD_LABELS, caracasDayInputValue, caracasHourValue } from "@/lib/time";
import { IconCalendar, IconChevronDown } from "@/components/icons";
import { PANEL_LABEL_CLASS, panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
// `GetForm` lleva a mano la espera de un filtro GET con `next/form`: con una
// acción de texto, `useFormStatus` (y por eso `SubmitButton`) nunca ve el
// envío como pendiente.
import { GetForm, GetSubmitButton } from "../_shared/get-form";
import { PERIOD_CHIP_ACTIVE_CLASS, PERIOD_CHIP_CLASS, PeriodChips } from "../_shared/period-chips";
import type { ReportRange, ReportView } from "./range";

/** Horas "00" a "23" para los <select> de filtro, en formato de 24 horas. */
const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));

/**
 * Elección del periodo de un reporte. Es un filtro, no una navegación, así que
 * se ve distinto de las pestañas de tipo de reporte: la etiqueta "Periodo",
 * las pastillas compartidas (`PeriodChips`, las tres en una fila también en el
 * teléfono; la elegida con borde grueso y marca de verificación) y "Otras
 * fechas", que despliega el formulario de rango debajo. El formulario arranca
 * abierto si ya hay fechas elegidas. Mismas opciones y mismo valor por
 * defecto ("Hoy") que el tablero del operador, para que el mismo operador no
 * vea dos juegos de periodos distintos.
 */
export function PeriodBar({ vista, range }: { vista: ReportView; range: ReportRange }) {
  const base = `/panel/reportes?vista=${vista}`;
  const personalizado = range.preset === "personalizado";
  const conHora = vista === "recaudacion";
  const etiquetaId = `periodo-${vista}`;
  // "Hoy" es el valor por defecto: su enlace no lleva `periodo`.
  const opciones = DASHBOARD_PERIODS.map((periodo) => ({
    href: periodo === "hoy" ? base : `${base}&periodo=${periodo}`,
    label: DASHBOARD_PERIOD_LABELS[periodo],
    active: range.preset === periodo,
  }));

  return (
    <div className="flex flex-col gap-2">
      <p id={etiquetaId} className="text-sm font-semibold text-tinta-suave">
        Periodo
      </p>
      <div className="flex flex-wrap items-start gap-2">
        <PeriodChips options={opciones} labelledBy={etiquetaId} />

        <details open={personalizado} className="group open:w-full">
          <summary
            className={cx(
              PERIOD_CHIP_CLASS,
              "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
              personalizado ? PERIOD_CHIP_ACTIVE_CLASS : "border-transparent text-marca-700 hover:bg-marca-50",
            )}
          >
            <IconCalendar className="size-5 shrink-0" />
            {personalizado ? "Fechas elegidas" : "Otras fechas"}
            <IconChevronDown className="size-5 shrink-0 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" />
          </summary>

          <GetForm action="/panel/reportes" className="mt-3 flex flex-col gap-4 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1">
            <input type="hidden" name="vista" value={vista} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className={PANEL_LABEL_CLASS}>
                Día de inicio
                <input
                  type="date"
                  name="desde"
                  required
                  defaultValue={caracasDayInputValue(range.from)}
                  className={panelInputClass("tabular")}
                />
              </label>
              {conHora ? (
                <label className={PANEL_LABEL_CLASS}>
                  Hora de inicio
                  <select name="horaDesde" defaultValue={caracasHourValue(range.from)} className={panelInputClass("tabular")}>
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h}:00
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className={PANEL_LABEL_CLASS}>
                Día de fin
                <input
                  type="date"
                  name="hasta"
                  required
                  defaultValue={caracasDayInputValue(range.to)}
                  className={panelInputClass("tabular")}
                />
              </label>
              {conHora ? (
                <label className={PANEL_LABEL_CLASS}>
                  Hora de fin
                  <select name="horaHasta" defaultValue={caracasHourValue(range.to)} className={panelInputClass("tabular")}>
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h}:59
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            <p className="text-sm text-tinta-suave">
              {conHora
                ? "Las horas van en formato de 24 horas. El día de fin cuenta hasta el final de la hora elegida."
                : "Se cuentan los días completos, desde el inicio del primero hasta el final del último."}
            </p>
            <GetSubmitButton pendingLabel="Buscando…" className={panelButtonClass("secundario", "md", "w-full sm:w-fit")}>
              Ver este periodo
            </GetSubmitButton>
          </GetForm>
        </details>
      </div>
    </div>
  );
}
