import Link from "next/link";
import { z } from "zod";
import { requirePanelUser } from "@/modules/auth";
import {
  departureTaxByHour,
  departureTaxRevenue,
  last24h,
  newAccounts,
  recurringAccounts,
  terminalTripCount,
} from "@/modules/reports";
import { formatCaracasDate, formatCaracasDateTime24 } from "@/lib/time";
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

/** Interpreta un rango de fechas de calendario en hora de Caracas (UTC-4 fijo, sin horario de verano). */
function parseDateRange(fromRaw: string | undefined, toRaw: string | undefined): { from: Date; to: Date } {
  const fallback = last24h();
  if (!fromRaw || !toRaw) return fallback;
  const from = new Date(`${fromRaw}T00:00:00-04:00`);
  const to = new Date(`${toRaw}T23:59:59-04:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return fallback;
  return { from, to };
}

function dateInputValue(date: Date): string {
  return formatCaracasDate(date).split("/").reverse().join("-");
}

export default async function TableroAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requirePanelUser("terminal.dashboard");
  const rawParams = searchParamsSchema.parse(await searchParams);
  const { from, to } = parseDateRange(rawParams.from, rawParams.to);
  const last24hRange = last24h();

  const [tax24h, trips, freshAccounts, returningAccounts, byHour] = await Promise.all([
    departureTaxRevenue(last24hRange.from, last24hRange.to),
    terminalTripCount(from, to),
    newAccounts(from, to),
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

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4"
      >
        <div>
          <label htmlFor="from" className="block text-xs font-medium text-[var(--color-texto-suave)]">
            Desde
          </label>
          <input
            type="date"
            id="from"
            name="from"
            defaultValue={dateInputValue(from)}
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
            defaultValue={dateInputValue(to)}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <LiveTaxCard
          initial={{
            totalUsd: formatMoney(tax24h.totalUsd, "USD"),
            reservations: tax24h.reservations,
            passengers: tax24h.passengers,
          }}
        />

        <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5">
          <p className="text-sm font-medium text-[var(--color-texto-suave)]">Total de recorridos del terminal</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular">{trips}</p>
          <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
            {formatCaracasDateTime24(from)} — {formatCaracasDateTime24(to)}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5">
          <p className="text-sm font-medium text-[var(--color-texto-suave)]">Usuarios nuevos</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular">{freshAccounts}</p>
          <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
            {formatCaracasDateTime24(from)} — {formatCaracasDateTime24(to)}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5">
          <p className="text-sm font-medium text-[var(--color-texto-suave)]">Usuarios recurrentes</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular">{returningAccounts}</p>
          <p className="mt-1 text-sm text-[var(--color-texto-suave)]">Dos o más viajes pagados, histórico</p>
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
