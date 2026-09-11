import Link from "next/link";
import { z } from "zod";
import { requirePanelUser } from "@/modules/auth";
import {
  departureTaxByHour,
  departureTaxRevenue,
  last24h,
  listNewAccounts,
  listTerminalTrips,
  recurringAccounts,
} from "@/modules/reports";
import {
  caracasDayEnd,
  caracasDayInputValue,
  caracasDayStart,
  formatCaracasDate,
  formatCaracasDateTime24,
  formatCaracasTime24,
} from "@/lib/time";
import { formatMoney } from "@/lib/decimal";
import { LiveTaxCard } from "./live-tax";

const searchParamsSchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/** Cuántas filas trae cada lista del tablero. Los contadores usan el total real. */
const LIST_LIMIT = 100;

/** Interpreta un rango de fechas de calendario en hora de Caracas. Cae a las últimas 24 h si falta un extremo o si el rango viene invertido. */
function resolveDateRange(
  fromRaw: string | undefined,
  toRaw: string | undefined,
): { from: Date; to: Date; isCustom: boolean } {
  const fallback = last24h();
  if (!fromRaw || !toRaw) return { ...fallback, isCustom: false };
  const from = caracasDayStart(fromRaw, fallback.from);
  const to = caracasDayEnd(toRaw, fallback.to);
  if (from > to) return { ...fallback, isCustom: false };
  return { from, to, isCustom: true };
}

export default async function TableroAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const panelUser = await requirePanelUser("terminal.dashboard");
  const rawParams = searchParamsSchema.parse(await searchParams);
  const { from, to, isCustom } = resolveDateRange(rawParams.from, rawParams.to);
  const last24hRange = last24h();

  const [tax24h, trips, newAccounts, returningAccounts, byHour] = await Promise.all([
    departureTaxRevenue(last24hRange.from, last24hRange.to),
    listTerminalTrips(from, to, { limit: LIST_LIMIT }),
    listNewAccounts(from, to, panelUser.id, { limit: LIST_LIMIT }),
    recurringAccounts(),
    departureTaxByHour(from, to),
  ]);

  const maxHourUsd = Math.max(0.01, ...byHour.map((h) => Number(h.totalUsd)));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Tablero del terminal</h2>
        <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
          Cifras agregadas de todas las agencias del terminal.
        </p>
      </div>

      <details className="group rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4">
        <summary className="flex list-none flex-wrap items-center gap-2 rounded-md border border-[var(--color-borde)] px-4 py-2 text-sm font-medium cursor-pointer hover:bg-[var(--color-acento-suave)] [&::-webkit-details-marker]:hidden">
          <span>
            Rango: {formatCaracasDateTime24(from)} — {formatCaracasDateTime24(to)}
          </span>
          {isCustom ? (
            <span className="rounded-full bg-[var(--color-acento-suave)] px-2 py-0.5 text-xs font-medium">
              Personalizado
            </span>
          ) : null}
          <span
            className="ml-auto text-[var(--color-texto-suave)] transition-transform duration-200 group-open:rotate-180"
            aria-hidden
          >
            ▾
          </span>
        </summary>

        <form
          method="get"
          className="mt-4 flex flex-wrap items-end gap-3 border-t border-[var(--color-borde)] pt-4"
        >
          <div>
            <label htmlFor="from" className="block text-xs font-medium text-[var(--color-texto-suave)]">
              Desde
            </label>
            <input
              type="date"
              id="from"
              name="from"
              defaultValue={caracasDayInputValue(from)}
              className="mt-1 rounded-md border border-[var(--color-borde)] px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="to" className="block text-xs font-medium text-[var(--color-texto-suave)]">
              Hasta
            </label>
            <input
              type="date"
              id="to"
              name="to"
              defaultValue={caracasDayInputValue(to)}
              className="mt-1 rounded-md border border-[var(--color-borde)] px-3 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-[var(--color-acento)] px-4 py-1.5 text-sm font-medium text-white"
          >
            Aplicar rango
          </button>
          <Link href="/panel/admin/tablero" className="text-sm text-[var(--color-texto-suave)] underline">
            Volver a las últimas 24 h
          </Link>
          <p className="w-full text-xs text-[var(--color-texto-suave)]">
            El rango de fechas aplica a recorridos, usuarios nuevos y al gráfico. La tarjeta de la tasa de
            salida siempre muestra las últimas 24 horas y se actualiza sola.
          </p>
        </form>
      </details>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <LiveTaxCard
          initial={{
            totalUsd: formatMoney(tax24h.totalUsd, "USD"),
            reservations: tax24h.reservations,
            passengers: tax24h.passengers,
          }}
        />

        <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5">
          <p className="text-sm font-medium text-[var(--color-texto-suave)]">Usuarios recurrentes</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular">{returningAccounts}</p>
          <p className="mt-1 text-sm text-[var(--color-texto-suave)]">Dos o más viajes pagados, histórico</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5">
          <p className="text-sm font-medium text-[var(--color-texto-suave)]">Total de recorridos del terminal</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular">{trips.total}</p>
          <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
            {formatCaracasDateTime24(from)} — {formatCaracasDateTime24(to)}
          </p>

          <div className="mt-4 max-h-96 overflow-auto rounded-lg border border-[var(--color-borde)]">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="sticky top-0 border-b border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto-suave)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Hora</th>
                  <th className="px-3 py-2 font-medium">Localización de embarque</th>
                  <th className="px-3 py-2 font-medium">Localización de desembarque</th>
                </tr>
              </thead>
              <tbody>
                {trips.rows.map((t) => (
                  <tr key={t.tripLogId} className="border-b border-[var(--color-borde)] last:border-0">
                    <td className="tabular px-3 py-2">
                      {t.departedAt ? formatCaracasDate(t.departedAt) : "—"}
                    </td>
                    <td className="tabular px-3 py-2">
                      {t.departedAt ? formatCaracasTime24(t.departedAt) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {t.origin} · {t.meetingPoint}
                    </td>
                    <td className="px-3 py-2">{t.destination}</td>
                  </tr>
                ))}
                {trips.rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-[var(--color-texto-suave)]">
                      No hay recorridos completados en el rango.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {trips.total > trips.rows.length ? (
            <p className="mt-2 text-xs text-[var(--color-texto-suave)]">
              Se muestran los {trips.rows.length} más recientes de {trips.total}.
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5">
          <p className="text-sm font-medium text-[var(--color-texto-suave)]">Usuarios nuevos</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular">{newAccounts.total}</p>
          <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
            {formatCaracasDateTime24(from)} — {formatCaracasDateTime24(to)}
          </p>

          <div className="mt-4 max-h-96 overflow-auto rounded-lg border border-[var(--color-borde)]">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="sticky top-0 border-b border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto-suave)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Hora</th>
                  <th className="px-3 py-2 font-medium">Cédula</th>
                  <th className="px-3 py-2 font-medium">Primer nombre</th>
                  <th className="px-3 py-2 font-medium">Primer apellido</th>
                </tr>
              </thead>
              <tbody>
                {newAccounts.rows.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--color-borde)] last:border-0">
                    <td className="tabular px-3 py-2">{formatCaracasDate(a.createdAt)}</td>
                    <td className="tabular px-3 py-2">{formatCaracasTime24(a.createdAt)}</td>
                    <td className="tabular px-3 py-2">{a.idNumber}</td>
                    <td className="px-3 py-2">{a.firstName}</td>
                    <td className="px-3 py-2">{a.firstSurname}</td>
                  </tr>
                ))}
                {newAccounts.rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-[var(--color-texto-suave)]">
                      No hay usuarios nuevos en el rango.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {newAccounts.total > newAccounts.rows.length ? (
            <p className="mt-2 text-xs text-[var(--color-texto-suave)]">
              Se muestran los {newAccounts.rows.length} más recientes de {newAccounts.total}.
            </p>
          ) : null}
          <p className="mt-2 text-xs text-[var(--color-texto-suave)]">
            Consulta registrada en la bitácora de auditoría.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5">
        <p className="text-sm font-medium text-[var(--color-texto-suave)]">
          Tasa de salida recaudada por hora del día ({formatCaracasDate(from)} — {formatCaracasDate(to)})
        </p>
        <div className="mt-4 flex items-end gap-1 overflow-x-auto pb-2">
          {byHour.map((h) => {
            const value = Number(h.totalUsd);
            const heightPct = value > 0 ? Math.max(4, Math.round((value / maxHourUsd) * 100)) : 0;
            return (
              <div key={h.hour} className="flex w-8 shrink-0 flex-col items-center gap-1">
                <div className="flex h-32 w-full items-end" title={`${h.hour} — ${formatMoney(h.totalUsd, "USD")}`}>
                  <div
                    className="w-full rounded-t bg-[var(--color-acento)]"
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className="text-[10px] text-[var(--color-texto-suave)] tabular">{h.hour}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
