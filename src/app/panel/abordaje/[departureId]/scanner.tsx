"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { Alert } from "@/components/alert";
import { IconCamera, IconCheckCircle, IconSearch, IconSpinner, IconXCircle } from "@/components/icons";
import { StatusBadge, panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import { plural } from "../../_shared/day-label";
import { confirmBoardingAction, findForBoardingAction, type BoardingTicket } from "../actions";

/** Resultado mínimo de detección de códigos de barras/QR del navegador. */
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => BarcodeDetectorLike;
  }
}

/** Lo que muestra la zona de resultado, grande y a todo color. */
type Resultado =
  | { kind: "ticket"; ticket: BoardingTicket }
  | { kind: "rechazo"; title: string; message: string }
  | { kind: "listo"; count: number; code: string };

const FALLA_CONEXION = "No pudimos conectar con el sistema. Revisa la conexión a internet e inténtalo de nuevo.";

/**
 * Botón con estado de espera para las acciones del escáner, que corren en el
 * cliente y no en un `<form action>`: mismo aspecto que `SubmitButton`.
 */
function PendingButton({
  pending,
  pendingLabel,
  className,
  children,
  type = "button",
  onClick,
  disabled,
}: {
  pending: boolean;
  pendingLabel: string;
  className: string;
  children: ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || pending}
      aria-disabled={disabled || pending ? true : undefined}
      className={className}
    >
      {pending ? (
        <>
          <IconSpinner className="size-5 shrink-0 animate-spin motion-reduce:animate-none" />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * Escáner de abordaje en la puerta del bus: el operador escribe el código del
 * ticket o lo lee con la cámara, ve en grande si el pasajero puede subir
 * (verde) o no (rojo, con el motivo y qué hacer) y confirma quiénes suben.
 * Tras cada abordaje el foco vuelve al campo del código para el siguiente.
 */
export function AbordajeScanner({ departureId }: { departureId: string }) {
  const [code, setCode] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [buscando, setBuscando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [camaraDisponible, setCamaraDisponible] = useState<boolean | null>(null);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [avisoCamara, setAvisoCamara] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const tituloTicketRef = useRef<HTMLHeadingElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const codeId = useId();
  const codeHintId = `${codeId}-ayuda`;

  const buscar = useCallback(
    async (valor: string) => {
      const limpio = valor.trim();
      if (!limpio) {
        setResultado({
          kind: "rechazo",
          title: "Falta el código",
          message: "Escribe el código del ticket o escanea su QR.",
        });
        inputRef.current?.focus();
        return;
      }
      setBuscando(true);
      setResultado(null);
      try {
        const r = await findForBoardingAction(departureId, limpio);
        if (r.ticket) {
          const ticket = r.ticket;
          setResultado({ kind: "ticket", ticket });
          // Solo se preseleccionan los que no han subido: los que ya abordaron no se reenvían.
          setSeleccionados(new Set(ticket.passengers.filter((p) => !p.boardedAtLabel).map((p) => p.id)));
          requestAnimationFrame(() => tituloTicketRef.current?.focus());
        } else {
          setResultado({
            kind: "rechazo",
            title: "No puede abordar",
            message: r.error ?? "No encontramos ese ticket.",
          });
          requestAnimationFrame(() => inputRef.current?.select());
        }
      } catch {
        setResultado({ kind: "rechazo", title: "No se pudo buscar", message: FALLA_CONEXION });
      } finally {
        setBuscando(false);
      }
    },
    [departureId],
  );

  const detenerCamara = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamaraActiva(false);
  }, []);

  useEffect(() => {
    // Se decide en el cliente, después de montar: el servidor no sabe qué navegador hay.
    const Detector = typeof window !== "undefined" ? window.BarcodeDetector : undefined;
    if (Detector) {
      detectorRef.current = new Detector({ formats: ["qr_code"] });
    }
    setCamaraDisponible(Boolean(Detector));
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function escanear() {
    const detector = detectorRef.current;
    const video = videoRef.current;
    if (!detector || !video) return;

    const tick = async () => {
      if (!streamRef.current) return;
      try {
        const codigos = await detector.detect(video);
        const primero = codigos[0];
        if (primero) {
          detenerCamara();
          setCode(primero.rawValue);
          await buscar(primero.rawValue);
          return;
        }
      } catch {
        // Un fotograma fallido se ignora y se sigue intentando.
      }
      if (streamRef.current) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  async function iniciarCamara() {
    setAvisoCamara(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamaraActiva(true);
      escanear();
    } catch {
      detenerCamara();
      setAvisoCamara(
        "No pudimos abrir la cámara. Revisa que el navegador tenga permiso para usarla, o escribe el código a mano.",
      );
    }
  }

  function limpiar() {
    setResultado(null);
    setCode("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function abordar(ticket: BoardingTicket) {
    setConfirmando(true);
    try {
      const r = await confirmBoardingAction(ticket.reservationId, [...seleccionados]);
      if (r.error) {
        setResultado({ kind: "rechazo", title: "No se registró el abordaje", message: r.error });
      } else {
        setResultado({ kind: "listo", count: r.boarded ?? seleccionados.size, code: ticket.code });
        setCode("");
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    } catch {
      setResultado({ kind: "rechazo", title: "No se registró el abordaje", message: FALLA_CONEXION });
    } finally {
      setConfirmando(false);
    }
  }

  function alternar(id: string) {
    setSeleccionados((prev) => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <section
        aria-label="Buscar ticket"
        className="flex flex-col gap-4 rounded-tarjeta border border-borde bg-superficie p-5 shadow-1"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void buscar(code);
          }}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor={codeId} className="text-sm font-semibold text-tinta">
              Código del ticket
            </label>
            <input
              ref={inputRef}
              id={codeId}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-describedby={codeHintId}
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="search"
              placeholder="TR-0910-2PAX-AB12"
              className={panelInputClass("tabular min-h-14 text-xl font-semibold uppercase tracking-wide")}
            />
            <p id={codeHintId} className="text-sm leading-snug text-tinta-suave">
              Está impreso en el ticket, debajo del código QR.
            </p>
          </div>
          <PendingButton
            type="submit"
            pending={buscando}
            pendingLabel="Buscando…"
            className={panelButtonClass("primario", "lg", "w-full")}
          >
            <IconSearch className="size-5 shrink-0" />
            Buscar ticket
          </PendingButton>
        </form>

        {camaraDisponible ? (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => (camaraActiva ? detenerCamara() : void iniciarCamara())}
              className={panelButtonClass("secundario", "lg", "w-full")}
            >
              <IconCamera className="size-5 shrink-0" />
              {camaraActiva ? "Detener la cámara" : "Leer el QR con la cámara"}
            </button>
            {camaraActiva ? (
              <p className="text-center text-sm text-tinta-suave">Apunta la cámara al código QR del ticket.</p>
            ) : null}
          </div>
        ) : camaraDisponible === false ? (
          <Alert tone="info" role="none">
            Este navegador no puede leer el QR con la cámara. Escribe el código que aparece debajo del QR.
          </Alert>
        ) : null}
        {avisoCamara ? <Alert tone="alerta">{avisoCamara}</Alert> : null}
        <video
          ref={videoRef}
          hidden={!camaraActiva}
          muted
          playsInline
          aria-label="Imagen de la cámara"
          className="w-full rounded-control border border-borde bg-tinta"
        />
      </section>

      <div aria-live="polite">
        {buscando ? (
          <p role="status" className="flex items-center justify-center gap-2 py-4 text-base text-tinta-suave">
            <IconSpinner className="size-5 animate-spin motion-reduce:animate-none" />
            Buscando el ticket…
          </p>
        ) : null}

        {resultado?.kind === "rechazo" ? (
          <section
            role="alert"
            className="flex flex-col items-center gap-3 rounded-tarjeta border-2 border-peligro bg-peligro-suave p-6 text-center"
          >
            <IconXCircle className="size-14 text-peligro" />
            <h2 className="text-2xl font-bold tracking-tight text-peligro">{resultado.title}</h2>
            <p className="text-lg leading-relaxed text-tinta">{resultado.message}</p>
            <button type="button" onClick={limpiar} className={panelButtonClass("secundario", "lg", "mt-1 w-full")}>
              Buscar otro ticket
            </button>
          </section>
        ) : null}

        {resultado?.kind === "listo" ? (
          <section
            role="status"
            className="flex flex-col items-center gap-2 rounded-tarjeta border-2 border-exito bg-exito-suave p-6 text-center"
          >
            <IconCheckCircle className="size-14 text-exito" />
            <h2 className="text-2xl font-bold tracking-tight text-exito">
              Listo: {plural(resultado.count, "pasajero a bordo", "pasajeros a bordo")}
            </h2>
            <p className="text-base leading-relaxed text-tinta">
              Ticket <span className="tabular font-semibold">{resultado.code}</span>. Ya puedes buscar el siguiente.
            </p>
          </section>
        ) : null}

        {resultado?.kind === "ticket" ? (
          <TicketResult
            ticket={resultado.ticket}
            seleccionados={seleccionados}
            onToggle={alternar}
            onConfirm={() => void abordar(resultado.ticket)}
            onCancel={limpiar}
            confirmando={confirmando}
            tituloRef={tituloTicketRef}
          />
        ) : null}
      </div>
    </div>
  );
}

/** Ticket válido: quiénes suben, avisos de saldo y la confirmación. */
function TicketResult({
  ticket,
  seleccionados,
  onToggle,
  onConfirm,
  onCancel,
  confirmando,
  tituloRef,
}: {
  ticket: BoardingTicket;
  seleccionados: Set<string>;
  onToggle: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  confirmando: boolean;
  tituloRef: RefObject<HTMLHeadingElement | null>;
}) {
  const porSubir = ticket.passengers.filter((p) => !p.boardedAtLabel);
  const sinMarcar = porSubir.filter((p) => !seleccionados.has(p.id)).length;
  const cuantos = seleccionados.size;

  return (
    <section className="overflow-hidden rounded-tarjeta border-2 border-exito bg-superficie shadow-1">
      <div className="flex items-center gap-4 bg-exito-suave px-5 py-4">
        <IconCheckCircle className="size-12 shrink-0 text-exito" />
        <div className="min-w-0">
          <h2 ref={tituloRef} tabIndex={-1} className="text-2xl font-bold tracking-tight text-exito outline-none">
            Puede abordar
          </h2>
          <p className="text-base text-tinta">
            Ticket <span className="tabular font-semibold">{ticket.code}</span> · {ticket.holderName}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-tinta-suave">
          Pago:
          <StatusBadge label={ticket.statusLabel} tone={ticket.statusTone} />
        </div>

        {ticket.balanceLabel ? (
          <Alert tone="alerta" role="none" title={`Falta cobrar ${ticket.balanceLabel}`}>
            Cóbralo antes de que suba, en Pasajeros y pagos o en la taquilla.
          </Alert>
        ) : null}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-base font-semibold text-tinta">¿Quiénes suben ahora?</legend>
          {ticket.passengers.map((p) => {
            const yaSubio = p.boardedAtLabel !== null;
            return (
              <label
                key={p.id}
                className={cx(
                  "flex min-h-14 items-center gap-3 rounded-control border px-4 py-3 transition-colors duration-150 ease-out motion-reduce:transition-none",
                  yaSubio
                    ? "cursor-not-allowed border-borde bg-lienzo"
                    : "cursor-pointer border-borde-control bg-superficie hover:border-marca-600 has-[:checked]:border-exito has-[:checked]:bg-exito-suave",
                )}
              >
                <input
                  type="checkbox"
                  checked={!yaSubio && seleccionados.has(p.id)}
                  onChange={() => onToggle(p.id)}
                  disabled={yaSubio}
                  className="foco size-6 shrink-0 accent-exito"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="text-base font-semibold text-tinta">{p.fullName}</span>
                  <span className="tabular text-sm text-tinta-suave">
                    Cédula {p.idNumber}
                    {yaSubio ? ` · ya subió a las ${p.boardedAtLabel}` : ""}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>

        {sinMarcar > 0 ? (
          <Alert tone="alerta" role="none">
            {sinMarcar === 1
              ? "El pasajero sin marcar no podrá subir después con este ticket."
              : `Los ${sinMarcar} pasajeros sin marcar no podrán subir después con este ticket.`}
          </Alert>
        ) : null}

        <PendingButton
          pending={confirmando}
          pendingLabel="Registrando abordaje…"
          disabled={cuantos === 0}
          onClick={onConfirm}
          className={panelButtonClass("exito", "lg", "w-full")}
        >
          {cuantos === 0
            ? "Marca quién sube"
            : `Confirmar abordaje de ${plural(cuantos, "pasajero", "pasajeros")}`}
        </PendingButton>
        <button type="button" onClick={onCancel} className={panelButtonClass("fantasma", "md", "w-full")}>
          Cancelar y buscar otro ticket
        </button>
      </div>
    </section>
  );
}
