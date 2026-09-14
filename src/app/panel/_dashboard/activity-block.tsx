import type { ActivityRow } from "@/modules/reports";
import type { StatusTone } from "@/lib/labels";
import { formatCaracas, formatCaracasDate, formatCaracasTime24 } from "@/lib/time";
import { EmptyState, SectionCard } from "@/components/panel-ui";

/**
 * Color del punto de cada tono, igual que el color de texto que usa
 * `StatusBadge` para el mismo tono (el punto hereda el color con `bg-current`).
 */
const DOT_TONE_CLASSES: Record<StatusTone, string> = {
  exito: "text-[var(--color-exito)]",
  alerta: "text-[var(--color-alerta)]",
  peligro: "text-[var(--color-peligro)]",
  marca: "text-[var(--color-acento)]",
  neutro: "text-[var(--color-texto-suave)]",
};

/**
 * Bloque "Actividad reciente" del tablero: la bitácora de la agencia ya
 * traducida a texto, con la hora y un punto de color del tono (nunca solo
 * color: el texto siempre dice qué pasó).
 */
export function ActivityBlock({
  activity,
  periodLabel,
  now,
}: {
  activity: { rows: ActivityRow[]; truncated: boolean };
  periodLabel: string;
  now: Date;
}) {
  return (
    <SectionCard
      title="Actividad reciente"
      description={`Registro de lo que pasó en tu agencia · ${periodLabel}`}
    >
      {activity.rows.length === 0 ? (
        <EmptyState title="Sin actividad registrada en este periodo." />
      ) : (
        <>
          <ol className="flex flex-col divide-y divide-[var(--color-borde)]">
            {activity.rows.map((entry) => {
              const mismoDia = formatCaracasDate(entry.at) === formatCaracasDate(now);
              return (
                <li key={entry.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="tabular w-16 shrink-0 pt-0.5 text-xs text-[var(--color-texto-suave)]">
                    {mismoDia ? formatCaracasTime24(entry.at) : formatCaracas(entry.at, "dd/MM HH:mm")}
                  </span>
                  <span
                    className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current ${DOT_TONE_CLASSES[entry.tone]}`}
                    aria-hidden="true"
                  />
                  <p className="text-sm">{entry.text}</p>
                </li>
              );
            })}
          </ol>
          {activity.truncated ? (
            <p className="mt-3 text-xs text-[var(--color-texto-suave)]">
              Se muestra la actividad más reciente.
            </p>
          ) : null}
        </>
      )}
    </SectionCard>
  );
}
