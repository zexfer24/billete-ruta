import Form from "next/form";
import { DASHBOARD_PERIODS, DASHBOARD_PERIOD_LABELS, caracasDayInputValue, caracasHourValue } from "@/lib/time";
import { SubmitButton } from "@/components/submit-button";
import { IconCalendar, IconChevronDown } from "@/components/icons";
import { PANEL_LABEL_CLASS, PanelTabs, panelButtonClass, panelInputClass } from "@/components/panel-ui";
import type { ReportRange, ReportView } from "./range";

/** Horas "00" a "23" para los <select> de filtro, en formato de 24 horas. */
const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));

/**
 * Elección del periodo de un reporte: una sola barra de accesos rápidos
 * ("Últimas 24 h", "Hoy", "7 días", "30 días") y, plegado debajo, "Elegir
 * otras fechas" con el formulario de rango. Así hay una manera principal de
 * elegir y el formulario solo aparece si se pide (o si ya está en uso).
 */
export function PeriodBar({ vista, range }: { vista: ReportView; range: ReportRange }) {
  const base = `/panel/reportes?vista=${vista}`;
  const personalizado = range.preset === "personalizado";
  const conHora = vista === "recaudacion";

  return (
    <div className="flex flex-col gap-3">
      <PanelTabs
        label="Periodo del reporte"
        tabs={[
          { href: base, label: "Últimas 24 h", active: range.preset === "24h" },
          ...DASHBOARD_PERIODS.map((periodo) => ({
            href: `${base}&periodo=${periodo}`,
            label: DASHBOARD_PERIOD_LABELS[periodo],
            active: range.preset === periodo,
          })),
        ]}
      />

      <details open={personalizado} className="group rounded-tarjeta border border-borde bg-superficie shadow-1">
        <summary className="foco flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-tarjeta px-4 text-[15px] font-semibold text-marca-700 transition-colors duration-150 ease-out hover:bg-marca-50 motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
          <IconCalendar className="size-5 shrink-0" />
          {personalizado ? "Fechas elegidas" : "Elegir otras fechas"}
          <IconChevronDown className="ml-auto size-5 shrink-0 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" />
        </summary>

        <Form action="/panel/reportes" className="flex flex-col gap-4 border-t border-borde px-4 py-4">
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
          <SubmitButton pendingLabel="Buscando…" className={panelButtonClass("secundario", "md", "w-full sm:w-fit")}>
            Ver este periodo
          </SubmitButton>
        </Form>
      </details>
    </div>
  );
}
