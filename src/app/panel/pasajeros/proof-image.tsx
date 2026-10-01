"use client";

import { useId, useRef } from "react";
import { panelButtonClass } from "@/components/ui-classes";
import { IconClose, IconSearch } from "@/components/icons";

/**
 * Imagen del comprobante en el panel lateral de revisión: al ancho del panel
 * y hasta el 60 % del alto de la pantalla, para que una captura vertical del
 * banco se pueda leer ahí mismo. Tocar la imagen o «Ampliar la imagen» (un
 * solo botón) la abre en tamaño completo dentro de un `<dialog>` de la misma
 * página, sin sacar al taquillero a otra pestaña. El diálogo se cierra con
 * «Cerrar», con Escape o tocando fuera de la imagen.
 */
export function ProofImage({ src, reference }: { src: string; reference: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  function open() {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <figure className="flex flex-col gap-2">
      {/* Un solo control: la imagen y «Ampliar la imagen» van en el mismo botón. */}
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        className="foco group flex w-full cursor-zoom-in flex-col items-start gap-2 rounded-control"
      >
        {/* Imagen subida por el pasajero y servida por /api/archivos: no pasa por next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`Comprobante de pago con referencia ${reference}.`}
          className="max-h-[60vh] w-full rounded-control border border-borde bg-lienzo object-contain"
        />
        <span className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-[15px] font-semibold text-marca-700 group-hover:bg-marca-50">
          <IconSearch className="size-5" />
          Ampliar la imagen
        </span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="m-auto max-h-[95dvh] w-[calc(100%-1rem)] max-w-5xl rounded-tarjeta border border-borde bg-superficie p-0 text-tinta shadow-2 backdrop:bg-tinta/70"
      >
        <div className="flex max-h-[95dvh] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-borde px-4 py-2">
            <h2 id={titleId} className="text-base font-semibold">
              Comprobante <span className="tabular">{reference}</span>
            </h2>
            <button type="button" onClick={close} autoFocus className={panelButtonClass("secundario")}>
              <IconClose className="size-5" />
              Cerrar
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto bg-lienzo p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Comprobante de pago con referencia ${reference}, en tamaño completo`} className="mx-auto max-w-full" />
          </div>
        </div>
      </dialog>
    </figure>
  );
}
