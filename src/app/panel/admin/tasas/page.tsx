import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { PanelFeedback } from "@/components/panel-feedback";
import { PanelPageHeader, SectionCard } from "@/components/panel-ui";
import { formatMoney } from "@/lib/decimal";
import { formatCaracasDateTime24 } from "@/lib/time";
import { requirePanelUser } from "@/modules/auth";
import {
  getCurrentDepartureTax,
  getCurrentExchangeRate,
  listDepartureTaxes,
  listExchangeRates,
} from "@/modules/catalog";
import { setDepartureTaxAction, setExchangeRateAction } from "./actions";
import { RateChangeForm } from "./rate-change-form";
import { RateHistory, type RateHistoryEntry } from "./rate-history";
import { PAGE_DESCRIPTION, PAGE_TITLE, RATE_SECTIONS, amountHint } from "./texts";

export const metadata: Metadata = { title: PAGE_TITLE };

/**
 * Textos de los códigos `?ok=` que devuelven las acciones de esta página. Es
 * un `Map` para que una clave heredada (`?ok=constructor`) no cuele un texto.
 */
const OK_LABELS = new Map<string, string>([
  ["tasa-salida", "Tasa de salida actualizada. Las reservas nuevas ya la cobran."],
  ["tasa-ves", "Tasa del bolívar actualizada. Los pagos nuevos en bolívares ya la usan."],
  ["tasa-cop", "Tasa del peso colombiano actualizada. Los pagos nuevos en pesos ya la usan."],
]);

function first(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Valor vigente destacado, con la fecha desde la que rige. */
function CurrentValue({
  label,
  value,
  since,
}: {
  label: string;
  value: string | null;
  since?: Date;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-semibold text-tinta-suave">{label}</p>
      {value ? (
        <>
          <p className="tabular text-3xl font-bold tracking-tight text-tinta">{value}</p>
          {since ? (
            <p className="tabular text-sm text-tinta-suave">Desde el {formatCaracasDateTime24(since)}</p>
          ) : null}
        </>
      ) : (
        <p className="text-base font-semibold text-alerta">Todavía no está configurada.</p>
      )}
    </div>
  );
}

/**
 * Tasas del terminal: la tasa de salida por pasajero y las tasas de cambio
 * del bolívar y del peso colombiano, cada una en su tarjeta con la misma
 * disposición. Cada cambio pide confirmación y solo aplica a las reservas
 * nuevas.
 */
export default async function TasasAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePanelUser("terminal.rates");
  const params = await searchParams;
  const okCode = first(params.ok);
  const ok = okCode ? OK_LABELS.get(okCode) : undefined;
  const error = first(params.error)?.slice(0, 300);

  const [currentDepartureTax, departureTaxHistory, vesRate, copRate, vesHistory, copHistory] =
    await Promise.all([
      getCurrentDepartureTax().catch(() => null),
      listDepartureTaxes(),
      getCurrentExchangeRate("VES"),
      getCurrentExchangeRate("COP"),
      listExchangeRates("VES"),
      listExchangeRates("COP"),
    ]);

  const taxEntries: RateHistoryEntry[] = departureTaxHistory.map((h) => ({
    id: h.id,
    amount: formatMoney(h.amountUsd, "USD"),
    effectiveFrom: h.effectiveFrom,
  }));

  const exchangeBlocks: Array<{
    currency: "VES" | "COP";
    prefix: string;
    current: Prisma.Decimal | null;
    history: RateHistoryEntry[];
    /** Qué se cambia, para el diálogo de confirmación. */
    subject: string;
  }> = [
    {
      currency: "VES",
      prefix: "Bs.",
      current: vesRate,
      history: vesHistory.map((h) => ({
        id: h.id,
        amount: formatMoney(h.rateFromUsd, "VES"),
        effectiveFrom: h.effectiveFrom,
      })),
      subject: "la tasa del bolívar",
    },
    {
      currency: "COP",
      prefix: "COP",
      current: copRate,
      history: copHistory.map((h) => ({
        id: h.id,
        amount: formatMoney(h.rateFromUsd, "COP"),
        effectiveFrom: h.effectiveFrom,
      })),
      subject: "la tasa del peso colombiano",
    },
  ];

  const currentTaxLabel = currentDepartureTax ? formatMoney(currentDepartureTax, "USD") : null;

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />

      <PanelFeedback error={error} ok={ok} />

      <SectionCard title={RATE_SECTIONS.tax.title} description={RATE_SECTIONS.tax.description}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <CurrentValue
            label={RATE_SECTIONS.tax.currentLabel}
            value={currentTaxLabel}
            since={departureTaxHistory[0]?.effectiveFrom}
          />
          <RateChangeForm
            key={departureTaxHistory[0]?.id ?? "sin-tasa"}
            action={setDepartureTaxAction}
            fieldName="amountUsd"
            label={RATE_SECTIONS.tax.fieldLabel}
            hint={amountHint(RATE_SECTIONS.tax.example)}
            prefix="$"
            subject="la tasa de salida"
            unit=" por pasajero"
            current={currentTaxLabel}
            primary
          />
        </div>
        <div className="mt-6 border-t border-borde pt-4">
          <RateHistory title="Historial" entries={taxEntries} />
        </div>
      </SectionCard>

      {/* Cada moneda en su tarjeta hermana, con la misma disposición que la
          tasa de salida: antes iban como tarjetas dentro de otra tarjeta. */}
      {exchangeBlocks.map((block) => {
        const texts = RATE_SECTIONS[block.currency];
        const currentLabel = block.current ? formatMoney(block.current, block.currency) : null;
        return (
          <SectionCard key={block.currency} title={texts.title} description={texts.description}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <CurrentValue label={texts.currentLabel} value={currentLabel} since={block.history[0]?.effectiveFrom} />
              <RateChangeForm
                key={block.history[0]?.id ?? `sin-tasa-${block.currency}`}
                action={setExchangeRateAction}
                fieldName="rateFromUsd"
                hiddenFields={{ currency: block.currency }}
                label={texts.fieldLabel}
                hint={amountHint(texts.example)}
                prefix={block.prefix}
                subject={block.subject}
                unit=" por cada dólar"
                current={currentLabel}
              />
            </div>
            <div className="mt-6 border-t border-borde pt-4">
              <RateHistory title="Historial" entries={block.history} />
            </div>
          </SectionCard>
        );
      })}
    </div>
  );
}
