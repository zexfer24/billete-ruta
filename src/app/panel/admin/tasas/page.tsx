import { requirePanelUser } from "@/modules/auth";
import {
  getCurrentDepartureTax,
  getCurrentExchangeRate,
  listDepartureTaxes,
  listExchangeRates,
} from "@/modules/catalog";
import { formatCaracasDateTime24 } from "@/lib/time";
import { formatMoney } from "@/lib/decimal";
import { setDepartureTaxAction, setExchangeRateAction } from "./actions";

export default async function TasasAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requirePanelUser("terminal.rates");
  const params = await searchParams;

  const [currentDepartureTax, departureTaxHistory, vesRate, copRate, vesHistory, copHistory] =
    await Promise.all([
      getCurrentDepartureTax().catch(() => null),
      listDepartureTaxes(),
      getCurrentExchangeRate("VES"),
      getCurrentExchangeRate("COP"),
      listExchangeRates("VES"),
      listExchangeRates("COP"),
    ]);

  const exchangeCards = [
    { currency: "VES" as const, label: "Bolívar (VES)", current: vesRate, history: vesHistory },
    { currency: "COP" as const, label: "Peso colombiano (COP)", current: copRate, history: copHistory },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Tasas del terminal</h2>
        <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
          Tasa de salida y tasas de cambio vigentes. Un cambio de tasa solo aplica a reservas nuevas: las
          reservas ya creadas conservan la tasa congelada al momento de crearse.
        </p>
      </div>

      {params.error && (
        <div className="rounded-xl border border-[var(--color-peligro)] bg-red-50 px-4 py-3 text-sm text-[var(--color-peligro)]">
          {params.error}
        </div>
      )}
      {params.ok && (
        <div className="rounded-xl border border-[var(--color-exito)] bg-green-50 px-4 py-3 text-sm text-[var(--color-exito)]">
          Tasa cargada con éxito.
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5">
          <h3 className="text-sm font-medium text-[var(--color-texto-suave)]">Tasa de salida vigente</h3>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular">
            {currentDepartureTax ? formatMoney(currentDepartureTax, "USD") : "No configurada"}
          </p>
          <form action={setDepartureTaxAction} className="mt-4 flex items-end gap-2">
            <div className="flex-1">
              <label htmlFor="amountUsd" className="block text-xs font-medium text-[var(--color-texto-suave)]">
                Nuevo monto (USD por pasajero)
              </label>
              <input
                id="amountUsd"
                name="amountUsd"
                required
                inputMode="decimal"
                placeholder="2.00"
                className="mt-1 w-full rounded-md border border-[var(--color-borde)] px-3 py-1.5 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-[var(--color-acento)] px-4 py-1.5 text-sm font-medium text-white"
            >
              Cargar
            </button>
          </form>
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-texto-suave)]">Historial</p>
            <ul className="mt-2 space-y-1 text-sm">
              {departureTaxHistory.map((h) => (
                <li key={h.id} className="flex justify-between gap-3 tabular">
                  <span>{formatMoney(h.amountUsd, "USD")}</span>
                  <span className="text-[var(--color-texto-suave)]">desde {formatCaracasDateTime24(h.effectiveFrom)}</span>
                </li>
              ))}
              {departureTaxHistory.length === 0 && (
                <li className="text-[var(--color-texto-suave)]">Sin historial.</li>
              )}
            </ul>
          </div>
        </div>

        {exchangeCards.map((c) => (
          <div key={c.currency} className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5">
            <h3 className="text-sm font-medium text-[var(--color-texto-suave)]">Tasa de cambio — {c.label}</h3>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular">
              {c.current ? `1 USD = ${formatMoney(c.current, c.currency)}` : "No configurada"}
            </p>
            <form action={setExchangeRateAction} className="mt-4 flex items-end gap-2">
              <input type="hidden" name="currency" value={c.currency} />
              <div className="flex-1">
                <label
                  htmlFor={`rate-${c.currency}`}
                  className="block text-xs font-medium text-[var(--color-texto-suave)]"
                >
                  Nueva tasa (monto por 1 USD)
                </label>
                <input
                  id={`rate-${c.currency}`}
                  name="rateFromUsd"
                  required
                  inputMode="decimal"
                  className="mt-1 w-full rounded-md border border-[var(--color-borde)] px-3 py-1.5 text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded-md bg-[var(--color-acento)] px-4 py-1.5 text-sm font-medium text-white"
              >
                Cargar
              </button>
            </form>
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-texto-suave)]">Historial</p>
              <ul className="mt-2 space-y-1 text-sm">
                {c.history.map((h) => (
                  <li key={h.id} className="flex justify-between gap-3 tabular">
                    <span>{formatMoney(h.rateFromUsd, c.currency)}</span>
                    <span className="text-[var(--color-texto-suave)]">desde {formatCaracasDateTime24(h.effectiveFrom)}</span>
                  </li>
                ))}
                {c.history.length === 0 && <li className="text-[var(--color-texto-suave)]">Sin historial.</li>}
              </ul>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
