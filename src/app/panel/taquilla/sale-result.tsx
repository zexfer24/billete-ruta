"use client";

import { useEffect, useRef } from "react";
import { formatCaracasDateTime24 } from "@/lib/time";
import { Alert } from "@/components/alert";
import { Isotipo } from "@/components/logo";
import { panelButtonClass } from "@/components/panel-ui";
import { IconCheckCircle, IconPlus, IconPrinter } from "@/components/icons";
import type { CounterSaleState } from "./actions";
import { formatAmount } from "./step-payment";

type SaleData = Extract<CounterSaleState, { status: "success" }>["sale"];

/**
 * Resultado de una venta en taquilla: un boleto con la marca, el código grande,
 * el viaje, lo cobrado y el QR; y los dos pasos que siguen: imprimir el
 * ticket o empezar otra venta. El foco llega al título para que el lector de
 * pantalla anuncie que la venta quedó registrada.
 */
export function SaleResult({ sale, onReset }: { sale: SaleData; onReset: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <IconCheckCircle className="size-12 text-exito" />
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight text-tinta outline-none">
          Venta registrada
        </h2>
        <p className="text-[15px] text-tinta-suave">Entrega el ticket al pasajero: lo necesita para embarcar.</p>
      </div>

      <article
        aria-label={`Ticket ${sale.code}`}
        className="overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-1"
      >
        <div className="flex items-center justify-between gap-3 bg-marca-600 px-5 py-4 text-white">
          <span className="flex items-center gap-2.5">
            <Isotipo tone="blanco" decorative className="h-8 w-auto" />
            <span className="text-lg font-extrabold tracking-tight">TicketRuta</span>
          </span>
          <span className="text-sm font-semibold text-white/85">Ticket de viaje</span>
        </div>

        <div className="flex flex-col items-center gap-5 p-5 sm:flex-row sm:items-start">
          {/* El QR llega como data URL PNG desde el servidor: no pasa por next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sale.qrDataUrl}
            alt={`Código QR del ticket ${sale.code}`}
            width={220}
            height={220}
            className="size-[220px] shrink-0 rounded-control border border-borde bg-white p-2"
          />
          <dl className="flex w-full min-w-0 flex-col gap-3 text-center sm:text-left">
            <div>
              <dt className="text-sm font-semibold text-tinta-suave">Código del ticket</dt>
              <dd className="tabular break-all text-2xl font-bold tracking-tight text-tinta">{sale.code}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-tinta-suave">Viaje</dt>
              <dd className="text-base font-semibold text-tinta">{sale.routeName}</dd>
              <dd className="tabular text-[15px] text-tinta-suave">
                {formatCaracasDateTime24(new Date(sale.departsAt))}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-tinta-suave">Total cobrado</dt>
              <dd className="tabular text-xl font-bold text-tinta">{formatAmount(sale.amountCharged, sale.currency)}</dd>
            </div>
          </dl>
        </div>
      </article>

      {sale.accountCreated ? (
        <Alert tone="info" role="none" title="Le creamos una cuenta al pasajero">
          Puede activarla cuando quiera en la página de registro de TicketRuta, con su cédula, su teléfono y su año de
          nacimiento. Así verá sus viajes y sus tickets en el teléfono.
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href={`/api/archivos/${sale.pdfPath}`}
          target="_blank"
          rel="noreferrer"
          className={panelButtonClass("secundario", "lg", "min-h-14 flex-1")}
        >
          <IconPrinter className="size-5" />
          Imprimir o descargar el ticket
          <span className="sr-only">(se abre en otra pestaña)</span>
        </a>
        <button type="button" onClick={onReset} className={panelButtonClass("primario", "lg", "min-h-14 flex-1")}>
          <IconPlus className="size-5" />
          Nueva venta
        </button>
      </div>
    </div>
  );
}
