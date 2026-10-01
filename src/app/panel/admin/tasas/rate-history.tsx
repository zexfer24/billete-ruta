import { StatusBadge } from "@/components/panel-ui";
import { formatCount } from "../_shared/format";
import { DISCLOSURE_SUMMARY_CLASS, DatePhrase, DisclosureChevron } from "../_shared/lists";

export interface RateHistoryEntry {
  id: string;
  /** Monto ya formateado: "$ 2,00", "Bs. 36,40". */
  amount: string;
  effectiveFrom: Date;
}

/** Cuántos cambios se ven sin abrir "Ver historial completo". */
const VISIBLE_ENTRIES = 5;

function HistoryItem({ entry, until, isCurrent }: { entry: RateHistoryEntry; until?: Date; isCurrent: boolean }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-borde py-2.5 last:border-0">
      <span className="flex items-center gap-2">
        <span className="tabular text-[15px] font-semibold text-tinta">{entry.amount}</span>
        {isCurrent ? <StatusBadge label="Vigente" tone="exito" /> : null}
      </span>
      {/* La misma frase de fecha y hora de todo el terminal, cada extremo entero. */}
      <span className="tabular text-sm text-tinta-suave">
        <DatePhrase lead="Desde" date={entry.effectiveFrom} />
        {until ? (
          <>
            {" "}
            <DatePhrase lead="hasta" date={until} />
          </>
        ) : null}
      </span>
    </li>
  );
}

/**
 * Historial de una tasa, del cambio más reciente al más antiguo, con el
 * periodo en que estuvo vigente cada valor. Muestra los últimos cinco y
 * guarda el resto detrás de "Ver historial completo". Si la tasa nunca cambió
 * solo lo dice en una línea.
 */
export function RateHistory({ entries, title }: { entries: RateHistoryEntry[]; title: string }) {
  if (entries.length === 0) {
    return <p className="text-sm text-tinta-suave">Todavía no hay cambios registrados.</p>;
  }
  // Con un solo valor, la lista repetiría el valor vigente y su fecha, que ya
  // se ven arriba en grande.
  if (entries.length === 1) {
    return (
      <p className="text-sm text-tinta-suave">
        <span className="font-semibold">{title}:</span> sin cambios anteriores.
      </p>
    );
  }

  const items = entries.map((entry, index) => (
    <HistoryItem key={entry.id} entry={entry} until={entries[index - 1]?.effectiveFrom} isCurrent={index === 0} />
  ));
  const visible = items.slice(0, VISIBLE_ENTRIES);
  const rest = items.slice(VISIBLE_ENTRIES);

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-semibold text-tinta-suave">{title}</p>
      <ul>{visible}</ul>
      {rest.length > 0 ? (
        <details className="group">
          <summary className={DISCLOSURE_SUMMARY_CLASS}>
            Ver historial completo ({formatCount(entries.length)} cambios)
            <DisclosureChevron />
          </summary>
          <ul>{rest}</ul>
        </details>
      ) : null}
    </div>
  );
}
