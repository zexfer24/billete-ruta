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

/**
 * Lo que muestra el escáner tras buscar o confirmar. `falta` es un aviso
 * junto al campo (no se escribió nada); los demás abren el veredicto a
 * pantalla completa, en verde o en rojo.
 */
type Resultado =
  | { kind: "falta" }
  | { kind: "ticket"; ticket: BoardingTicket }
  | { kind: "rechazo"; title: string; message: string }
  | { kind: "listo"; count: number; code: string; names: string[] };

const FALLA_CONEXION = "No pudimos conectar con el sistema. Revisa la conexión a internet e inténtalo de nuevo.";

/** Botones del veredicto: blancos y grandes sobre el fondo verde o rojo, con foco blanco. */
const VEREDICTO_FOCO = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white";
const VEREDICTO_BOTON_PRINCIPAL =
  "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-control bg-white px-6 text-lg font-semibold transition-opacity duration-150 ease-out hover:opacity-90 disabled:opacity-80 motion-reduce:transition-none";
const VEREDICTO_BOTON_SECUNDARIO =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control border-2 border-white px-6 text-base font-semibold text-white transition-colors duration-150 ease-out hover:bg-white/10 motion-reduce:transition-none";

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
  buttonRef,
}: {
  pending: boolean;
  pendingLabel: string;
  className: string;
  children: ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  buttonRef?: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      ref={buttonRef}
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
 * Veredicto a pantalla completa (spec 7.2): fondo verde o rojo, icono muy
 * grande, el título y el nombre en letra grande, para leerlo de un vistazo en
 * la puerta del bus. Usa el `<dialog>` nativo en modo modal: tapa el resto de
 * la página, atrapa el foco y se cierra con Escape (que hace lo mismo que el
 * botón principal de cerrar). Sin animaciones.
 */
function Veredicto({
  tone,
  title,
  name,
  children,
  primary,
  secondary,
  onDismiss,
}: {
  tone: "exito" | "peligro";
  title: string;
  name?: string;
  children?: ReactNode;
  primary: { label: string; onClick: () => void; pending?: boolean; pendingLabel?: string };
  secondary?: { label: string; onClick: () => void };
  /** Qué hacer con Escape. */
  onDismiss: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    primaryRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (dialog.open) dialog.close();
    };
  }, []);

  const Icon = tone === "exito" ? IconCheckCircle : IconXCircle;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(event) => {
        event.preventDefault();
        if (!primary.pending) onDismiss();
      }}
      onClose={() => {
        // Si el navegador lo cerró por su cuenta (Escape repetido), el estado se
        // pone al día. Un cierre seguido de una reapertura (React en desarrollo)
        // llega con el diálogo ya abierto y se ignora.
        if (!dialogRef.current?.open) onDismiss();
      }}
      className={cx(
        "fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 p-0 text-white",
        tone === "exito" ? "bg-exito" : "bg-peligro",
      )}
    >
      <div className="flex min-h-full flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-10 text-center">
        <Icon className="size-24 shrink-0 text-white" />
        <div className="flex flex-col gap-3">
          <h2 id={titleId} className="text-4xl font-bold tracking-tight sm:text-5xl">
            {title}
          </h2>
          {name ? <p className="text-3xl font-bold leading-tight">{name}</p> : null}
        </div>
        <div id={bodyId} className="flex max-w-lg flex-col gap-2 text-xl leading-relaxed">
          {children}
        </div>
        <div className="flex w-full max-w-sm flex-col gap-3">
          <PendingButton
            buttonRef={primaryRef}
            pending={Boolean(primary.pending)}
            pendingLabel={primary.pendingLabel ?? "Registrando…"}
            onClick={primary.onClick}
            className={cx(VEREDICTO_BOTON_PRINCIPAL, VEREDICTO_FOCO, tone === "exito" ? "text-exito" : "text-peligro")}
          >
            {primary.label}
          </PendingButton>
          {secondary ? (
            <button
              type="button"
              onClick={secondary.onClick}
              disabled={primary.pending}
              className={cx(VEREDICTO_BOTON_SECUNDARIO, VEREDICTO_FOCO)}
            >
              {secondary.label}
            </button>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}

/**
 * Escáner de abordaje en la puerta del bus: el operador escribe el código del
 * ticket o lo lee con la cámara y ve a pantalla completa si el pasajero puede
 * subir (verde, con el nombre del titular) o no (rojo, con el motivo y qué
 * hacer). Luego confirma quiénes suben. Tras cada abordaje el foco vuelve al
 * campo del código para el siguiente.
 */
export function AbordajeScanner({ departureId }: { departureId: string }) {
  const [code, setCode] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [veredicto, setVeredicto] = useState(false);
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
  const codeErrorId = `${codeId}-error`;

  const mostrar = useCallback((nuevo: Resultado) => {
    setResultado(nuevo);
    setVeredicto(nuevo.kind !== "falta");
  }, []);

  const buscar = useCallback(
    async (valor: string) => {
      const limpio = valor.trim();
      if (!limpio) {
        mostrar({ kind: "falta" });
        inputRef.current?.focus();
        return;
      }
      setBuscando(true);
      setResultado(null);
      setVeredicto(false);
      try {
        const r = await findForBoardingAction(departureId, limpio);
        if (r.ticket) {
          const ticket = r.ticket;
          // Solo se preseleccionan los que no han subido: los que ya abordaron no se reenvían.
          setSeleccionados(new Set(ticket.passengers.filter((p) => !p.boardedAtLabel).map((p) => p.id)));
          mostrar({ kind: "ticket", ticket });
        } else {
          mostrar({ kind: "rechazo", title: "No puede abordar", message: r.error ?? "No encontramos ese ticket." });
        }
      } catch {
        mostrar({ kind: "rechazo", title: "No se pudo buscar", message: FALLA_CONEXION });
      } finally {
        setBuscando(false);
      }
    },
    [departureId, mostrar],
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

  /** Vuelve al campo del código, vacío, para el siguiente ticket. */
  function limpiar() {
    setResultado(null);
    setVeredicto(false);
    setCode("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  /** Cierra el veredicto verde y deja ver el ticket para elegir quiénes suben. */
  function verTicket() {
    setVeredicto(false);
    requestAnimationFrame(() => tituloTicketRef.current?.focus());
  }

  async function abordar(ticket: BoardingTicket) {
    setConfirmando(true);
    const nombres = ticket.passengers.filter((p) => seleccionados.has(p.id) && !p.boardedAtLabel).map((p) => p.fullName);
    try {
      const r = await confirmBoardingAction(ticket.reservationId, [...seleccionados]);
      if (r.error) {
        mostrar({ kind: "rechazo", title: "No se registró el abordaje", message: r.error });
      } else {
        mostrar({ kind: "listo", count: r.boarded ?? seleccionados.size, code: ticket.code, names: nombres });
        setCode("");
      }
    } catch {
      mostrar({ kind: "rechazo", title: "No se registró el abordaje", message: FALLA_CONEXION });
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

  const falta = resultado?.kind === "falta";

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
              onChange={(e) => {
                setCode(e.target.value);
                if (falta) setResultado(null);
              }}
              aria-describedby={falta ? `${codeHintId} ${codeErrorId}` : codeHintId}
              aria-invalid={falta ? true : undefined}
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="search"
              className={panelInputClass("tabular min-h-14 text-xl font-semibold uppercase tracking-wide")}
            />
            <p id={codeHintId} className="text-sm leading-snug text-tinta-suave">
              Está impreso en el ticket, debajo del código QR. Por ejemplo:{" "}
              <span className="tabular whitespace-nowrap">TR-0910-2PAX-AB12</span>.
            </p>
            {falta ? (
              <p id={codeErrorId} role="alert" className="flex items-center gap-1.5 text-sm font-semibold text-peligro">
                <IconXCircle className="size-4 shrink-0" />
                Escribe el código del ticket o escanea su QR.
              </p>
            ) : null}
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

      {buscando ? (
        <p role="status" className="flex items-center justify-center gap-2 py-4 text-base text-tinta-suave">
          <IconSpinner className="size-5 animate-spin motion-reduce:animate-none" />
          Buscando el ticket…
        </p>
      ) : null}

      {resultado?.kind === "ticket" && !veredicto ? (
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

      {veredicto && resultado?.kind === "ticket" ? (
        <TicketVeredicto
          key={`ticket-${resultado.ticket.reservationId}`}
          ticket={resultado.ticket}
          confirmando={confirmando}
          onConfirm={() => void abordar(resultado.ticket)}
          onChoose={verTicket}
          onCancel={limpiar}
        />
      ) : null}

      {veredicto && resultado?.kind === "rechazo" ? (
        <Veredicto
          key={`rechazo-${resultado.title}-${resultado.message}`}
          tone="peligro"
          title={resultado.title}
          primary={{ label: "Buscar otro ticket", onClick: limpiar }}
          onDismiss={limpiar}
        >
          <p>{resultado.message}</p>
        </Veredicto>
      ) : null}

      {veredicto && resultado?.kind === "listo" ? (
        <Veredicto
          key={`listo-${resultado.code}`}
          tone="exito"
          title={`Listo: ${plural(resultado.count, "pasajero a bordo", "pasajeros a bordo")}`}
          primary={{ label: "Escanear el siguiente", onClick: limpiar }}
          onDismiss={limpiar}
        >
          {resultado.names.length > 0 ? (
            <ul className="flex flex-col gap-1 text-2xl font-semibold">
              {resultado.names.map((nombre, i) => (
                <li key={`${i}-${nombre}`}>{nombre}</li>
              ))}
            </ul>
          ) : null}
          <p>
            Ticket <span className="tabular font-semibold">{resultado.code}</span>
          </p>
        </Veredicto>
      ) : null}
    </div>
  );
}

/**
 * Veredicto verde de un ticket válido: el titular en grande y qué sigue. Si
 * solo falta subir una persona y no hay saldo, se confirma desde aquí mismo;
 * si no, se pasa a elegir quiénes suben.
 */
function TicketVeredicto({
  ticket,
  confirmando,
  onConfirm,
  onChoose,
  onCancel,
}: {
  ticket: BoardingTicket;
  confirmando: boolean;
  onConfirm: () => void;
  onChoose: () => void;
  onCancel: () => void;
}) {
  const porSubir = ticket.passengers.filter((p) => !p.boardedAtLabel);
  const directo = porSubir.length === 1 && !ticket.balanceLabel;
  return (
    <Veredicto
      tone="exito"
      title={porSubir.length > 0 ? "Puede abordar" : "Ya subieron todos"}
      name={ticket.holderName}
      primary={
        directo
          ? {
              label: "Confirmar abordaje",
              onClick: onConfirm,
              pending: confirmando,
              pendingLabel: "Registrando abordaje…",
            }
          : { label: porSubir.length > 0 ? "Elegir quiénes suben" : "Ver el ticket", onClick: onChoose }
      }
      secondary={directo ? { label: "Ver el ticket", onClick: onChoose } : { label: "Buscar otro ticket", onClick: onCancel }}
      onDismiss={onChoose}
    >
      <p>
        Ticket <span className="tabular font-semibold">{ticket.code}</span> ·{" "}
        {plural(ticket.passengers.length, "pasajero", "pasajeros")}
      </p>
      {ticket.balanceLabel ? (
        <p className="font-bold">Falta cobrar {ticket.balanceLabel} antes de que suba.</p>
      ) : null}
    </Veredicto>
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
