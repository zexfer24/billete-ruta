import type { ActivityRow } from "@/modules/reports";
import type { StatusTone } from "@/lib/labels";
import { formatCaracas, formatCaracasDate, formatCaracasTime24 } from "@/lib/time";
import { EmptyState } from "@/components/panel-ui";
import { IconList } from "@/components/icons";

/** Color del punto de cada tono. Refuerza la frase, nunca la sustituye. */
const DOT_TONE_CLASSES: Record<StatusTone, string> = {
  exito: "bg-exito",
  alerta: "bg-alerta",
  peligro: "bg-peligro",
  marca: "bg-marca-600",
  neutro: "bg-tinta-tenue",
};

/**
 * Contenido de "Actividad reciente": la bitácora de la agencia ya traducida a
 * frases, con la hora de cada una. Va dentro de una sección plegable del
 * tablero, porque es consulta, no trabajo del día.
 */
export async function ActivityBlock({
  activity,
  now,
}: {
  activity: Promise<{ rows: ActivityRow[]; truncated: boolean }>;
  now: Date;
}) {
  const { rows, truncated } = await activity;

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<IconList />}
        title="Sin actividad en este periodo"
        description="Aquí aparecerán las ventas, los cobros y los embarques de tu agencia."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col divide-y divide-borde">
        {rows.map((entry) => {
          const mismoDia = formatCaracasDate(entry.at) === formatCaracasDate(now);
          return (
            <li key={entry.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span className="tabular w-24 shrink-0 text-sm font-medium text-tinta-suave">
                {mismoDia ? formatCaracasTime24(entry.at) : formatCaracas(entry.at, "dd/MM HH:mm")}
              </span>
              <span
                aria-hidden="true"
                className={`mt-2 size-2 shrink-0 rounded-full ${DOT_TONE_CLASSES[entry.tone]}`}
              />
              <p className="min-w-0 text-[15px] leading-relaxed text-tinta">{entry.text}</p>
            </li>
          );
        })}
      </ol>
      {truncated ? (
        <p className="text-sm text-tinta-suave">Se muestra solo la actividad más reciente.</p>
      ) : null}
    </div>
  );
}
