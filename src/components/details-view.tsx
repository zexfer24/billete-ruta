"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconCopy } from "./icons";
import { detailLabel, isCopyableDetail } from "./passenger-copy";
import { buttonClass } from "./ui-classes";

/**
 * Muestra los "datos de cobro" de un método de pago (banco, RIF, teléfono,
 * billetera…) como una lista de pares nombre-valor, con nombres legibles en
 * vez de las claves técnicas y un botón "Copiar" en cada dato que se escribe
 * en otra app. Si el valor no es un objeto, lo muestra como texto. Lo usan
 * el asistente de reserva y el formulario de comprobante de una reserva.
 */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

/** Texto de un valor JSON para mostrarlo o copiarlo. */
function valueText(value: JsonValue): string {
  if (value === null) return "";
  if (Array.isArray(value)) return value.map(valueText).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Botón que copia un dato al portapapeles y confirma con "Copiado" durante unos segundos. */
function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), 2500);
    return () => window.clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      // Sin permiso de portapapeles (o navegador antiguo): se pide copiarlo a mano.
      setState("failed");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copiar ${label}`}
        className={buttonClass("secundario", "shrink-0 px-3", "sm")}
      >
        {state === "copied" ? (
          <IconCheck aria-hidden="true" className="size-4" />
        ) : (
          <IconCopy aria-hidden="true" className="size-4" />
        )}
        {state === "copied" ? "Copiado" : "Copiar"}
      </button>
      <span className="sr-only" role="status">
        {state === "copied" ? `${label} copiado` : state === "failed" ? "No se pudo copiar. Cópialo a mano." : ""}
      </span>
    </>
  );
}

export function DetailsView({ value }: { value: JsonValue }) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value).filter(([, entry]) => valueText(entry).trim() !== "");

    return (
      <dl className="flex flex-col divide-y divide-borde">
        {entries.map(([key, entry]) => {
          const label = detailLabel(key);
          const text = valueText(entry);
          const copyable = isCopyableDetail(key);
          return (
            <div key={key} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <dt className="text-sm text-tinta-suave">{label}</dt>
                <dd
                  className={
                    copyable
                      ? "tabular break-all text-base font-semibold text-tinta"
                      : "break-words text-base text-tinta"
                  }
                >
                  {text}
                </dd>
              </div>
              {copyable ? <CopyButton text={text} label={label} /> : null}
            </div>
          );
        })}
      </dl>
    );
  }

  return <p className="text-base text-tinta">{valueText(value)}</p>;
}
