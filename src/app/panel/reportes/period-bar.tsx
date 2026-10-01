import Form from "next/form";
import Link from "next/link";
import { DASHBOARD_PERIODS, DASHBOARD_PERIOD_LABELS, caracasDayInputValue, caracasHourValue } from "@/lib/time";
import { SubmitButton } from "@/components/submit-button";
import { IconCalendar, IconChevronDown } from "@/components/icons";
import { PANEL_LABEL_CLASS, panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import type { ReportRange, ReportView } from "./range";

/** Horas "00" a "23" para los <select> de filtro, en formato de 24 horas. */
const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));

/** Pastilla de periodo: 44 px de alto, la elegida rellena de morado. */
const CHIP_CLASS =
  "foco inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pastilla border px-4 text-[15px] font-semibold transition-colors duration-150 ease-out motion-reduce:transition-none";

/**
 * Rejilla de las cuatro pastillas: en el teléfono, dos filas de dos del mismo
 * ancho (antes "30 días" quedaba sola en un renglón); desde `sm`, en fila.
 */
const CHIP_LIST_CLASS = "grid grid-cols-2 gap-2 sm:flex sm:flex-wrap";

/**
 * Elección del periodo de un reporte. Es un filtro, no una navegación, así que
 * se ve distinto de las pestañas de tipo de reporte: la etiqueta "Periodo",
 * pastillas compactas (dos por fila en el teléfono, en fila desde `sm`; nunca
 * se esconden a la derecha) y "Otras fechas", que despliega el formulario de
 * rango debajo. El formulario arranca abierto si ya hay fechas elegidas.
 */
export function PeriodBar({ vista, range }: { vista: ReportView; range: ReportRange }) {
  const base = `/panel/reportes?vista=${vista}`;
  const personalizado = range.preset === "personalizado";
  const conHora = vista === "recaudacion";
  const etiquetaId = `periodo-${vista}`;
  const opciones = [
    { href: base, label: "Últimas 24 h", active: range.preset === "24h" },
    ...DASHBOARD_PERIODS.map((periodo) => ({
      href: `${base}&periodo=${periodo}`,
      label: DASHBOARD_PERIOD_LABELS[periodo],
      active: range.preset === periodo,
    })),
  ];

  return (
    <div className="flex flex-col gap-2">
      <p id={etiquetaId} className="text-sm font-semibold text-tinta-suave">
        Periodo
      </p>
      <div className="flex flex-wrap items-start gap-2">
        <nav aria-labelledby={etiquetaId} className="w-full sm:w-auto">
          <ul className={CHIP_LIST_CLASS}>
            {opciones.map((opcion) => (
              <li key={opcion.href}>
                <Link
                  href={opcion.href}
                  aria-current={opcion.active ? "page" : undefined}
                  className={cx(
                    CHIP_CLASS,
                    "w-full justify-center sm:w-auto sm:justify-start",
                    opcion.active
                      ? "border-marca-600 bg-marca-600 text-white"
                      : "border-borde-control bg-superficie text-tinta hover:bg-marca-50",
                  )}
                >
                  {opcion.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <details open={personalizado} className="group open:w-full">
          <summary
            className={cx(
              CHIP_CLASS,
              "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
              personalizado
                ? "border-marca-600 bg-marca-600 text-white"
                : "border-transparent text-marca-700 hover:bg-marca-50",
            )}
          >
            <IconCalendar className="size-5 shrink-0" />
            {personalizado ? "Fechas elegidas" : "Otras fechas"}
            <IconChevronDown className="size-5 shrink-0 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" />
          </summary>

          <Form action="/panel/reportes" className="mt-3 flex flex-col gap-4 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1">
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
    </div>
  );
}
