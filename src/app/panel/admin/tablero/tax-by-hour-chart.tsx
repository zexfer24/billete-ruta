import type { Prisma } from "@prisma/client";
import { IconChart } from "@/components/icons";
import { EmptyState, SectionCard } from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import { formatMoney, ZERO } from "@/lib/decimal";
import { DISCLOSURE_SUMMARY_CLASS, DisclosureChevron } from "../_shared/lists";

interface HourTotal {
  /** "07:00". */
  hour: string;
  totalUsd: Prisma.Decimal;
}

/** Frase de ayuda del gráfico, según abarque un día o varios. La usa también su silueta. */
export function chartDescription(severalDays: boolean): string {
  return severalDays
    ? "Suma de todos los días del periodo, según la hora en que se pagó cada reserva."
    : "Según la hora en que se pagó cada reserva.";
}

/** Texto de la leyenda bajo las barras, compartido con la silueta. */
export const CHART_CAPTION = "Horas del día, de 00 a 23. La barra más oscura es la hora con más cobro.";

/**
 * Celda del rótulo de una hora bajo su barra, compartida con la silueta. Con
 * `flex justify-center` el número queda centrado sobre la barra aunque sea más
 * ancho que la celda (pantallas angostas).
 */
export const HOUR_LABEL_CELL_CLASS = "tabular flex min-w-0 flex-1 justify-center text-sm text-tinta-tenue";

/** Texto del desplegable con las cifras exactas, compartido con la silueta. */
export const CHART_DETAIL_LABEL = "Ver el monto de cada hora";

/**
 * Gráfico de barras de la tasa de salida cobrada por hora del día. Las 24
 * barras reparten el ancho disponible, así que nunca obligan a desplazarse de
 * lado; en pantallas angostas se rotulan cada tres horas. Una frase resume el
 * dato clave, el eje marca el máximo y las cifras exactas quedan en "Ver el
 * monto de cada hora", accesibles también en pantallas táctiles y con lector
 * de pantalla.
 */
export function TaxByHourChart({
  title,
  hours,
  severalDays,
}: {
  title: string;
  hours: HourTotal[];
  severalDays: boolean;
}) {
  const description = chartDescription(severalDays);

  const total = hours.reduce((sum, h) => sum.add(h.totalUsd), ZERO);
  const peak = hours.reduce<HourTotal | null>(
    (best, h) => (h.totalUsd.gt(best?.totalUsd ?? ZERO) ? h : best),
    null,
  );

  if (!peak || total.lte(ZERO)) {
    return (
      <SectionCard title={title} description={description}>
        <EmptyState
          icon={<IconChart />}
          title="No se cobró tasa de salida en este periodo"
          description="Las barras aparecen cuando los pasajeros terminan de pagar sus reservas. Prueba con un periodo más largo."
        />
      </SectionCard>
    );
  }

  const peakValue = Number(peak.totalUsd);
  const peakLabel = formatMoney(peak.totalUsd, "USD");
  const summary = `Se cobró más a las ${peak.hour}: ${peakLabel}. En total se cobraron ${formatMoney(total, "USD")}.`;
  const paidHours = hours.filter((h) => h.totalUsd.gt(ZERO));

  return (
    <SectionCard title={title} description={description}>
      <div className="flex flex-col gap-5">
        <p className="text-base leading-relaxed text-tinta">
          Se cobró más a las <strong className="tabular">{peak.hour}</strong>:{" "}
          <strong className="tabular">{peakLabel}</strong>. En total se cobraron{" "}
          <strong className="tabular">{formatMoney(total, "USD")}</strong>.
        </p>

        <figure className="flex flex-col gap-2">
          <div className="flex gap-2 sm:gap-3">
            {/* Eje de montos: el máximo arriba y cero abajo, cada rótulo centrado
                en su valor (el tope de la barra más alta y la línea base), no
                media línea hacia adentro. */}
            <div
              aria-hidden="true"
              className="tabular flex h-44 shrink-0 flex-col justify-between text-right text-sm text-tinta-tenue"
            >
              <span className="-translate-y-1/2">{peakLabel}</span>
              <span className="translate-y-1/2">{formatMoney(ZERO, "USD")}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div
                role="img"
                aria-label={summary}
                className="relative flex h-44 items-end gap-px border-b border-borde-control sm:gap-1"
              >
                {/* Línea guía tenue a la altura del máximo, la del rótulo de arriba.
                    Va detrás de las barras (z-0 frente a z-10): encima, picaba el
                    borde superior de la barra más alta. */}
                <span className="pointer-events-none absolute inset-x-0 top-0 z-0 border-t border-dashed border-borde" />
                {hours.map((h) => {
                  const value = Number(h.totalUsd);
                  const percent = value > 0 ? Math.max(3, Math.round((value / peakValue) * 100)) : 0;
                  return (
                    <div key={h.hour} className="relative z-10 flex h-full min-w-0 flex-1 items-end">
                      {percent > 0 ? (
                        <div
                          className={cx(
                            "w-full rounded-t-sm",
                            h.hour === peak.hour ? "bg-marca-700" : "bg-marca-500",
                          )}
                          style={{ height: `${percent}%` }}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {/* Cada rótulo va centrado bajo su barra aunque sea más ancho que
                  ella (en el teléfono la celda mide unos 10 px y "18", unos 17):
                  `text-center` alinea a la izquierda un texto que desborda su
                  caja, `justify-center` de flexbox lo reparte a los dos lados. */}
              <div aria-hidden="true" className="mt-1.5 flex gap-px sm:gap-1">
                {hours.map((h, index) => (
                  <span key={h.hour} className={cx(HOUR_LABEL_CELL_CLASS, index % 3 !== 0 && "max-md:invisible")}>
                    <span className="whitespace-nowrap">{h.hour.slice(0, 2)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <figcaption className="text-sm text-tinta-suave">{CHART_CAPTION}</figcaption>
        </figure>

        <details className="group">
          <summary className={DISCLOSURE_SUMMARY_CLASS}>
            {CHART_DETAIL_LABEL}
            <DisclosureChevron />
          </summary>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {paidHours.map((h) => (
              <li
                key={h.hour}
                className="tabular flex items-center justify-between gap-3 rounded-control border border-borde px-3 py-2 text-[15px]"
              >
                <span className="font-semibold text-tinta">{h.hour}</span>
                <span className="text-tinta">{formatMoney(h.totalUsd, "USD")}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-tinta-suave">Las horas que no aparecen no tuvieron cobros.</p>
        </details>
      </div>
    </SectionCard>
  );
}
