"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { confirmBoardingAction, findForBoardingAction } from "../actions";

type FindResult = Awaited<ReturnType<typeof findForBoardingAction>>;

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

export function AbordajeScanner({ departureId }: { departureId: string }) {
  const [code, setCode] = useState("");
  const [resultado, setResultado] = useState<FindResult | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [buscando, setBuscando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [camaraDisponible, setCamaraDisponible] = useState(false);
  const [camaraActiva, setCamaraActiva] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);

  const buscar = useCallback(
    async (valor: string) => {
      if (!valor.trim()) return;
      setBuscando(true);
      setMensaje(null);
      const r = await findForBoardingAction(departureId, valor.trim());
      setResultado(r);
      setSeleccionados(new Set(r.reservation ? r.reservation.passengers.map((p) => p.id) : []));
      setBuscando(false);
    },
    [departureId],
  );

  const detenerCamara = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamaraActiva(false);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.BarcodeDetector) {
      setCamaraDisponible(true);
      detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
    }
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
      setMensaje("No se pudo acceder a la cámara. Escribe el serial manualmente.");
    }
  }

  async function abordarGrupo() {
    if (!resultado?.reservation) return;
    setConfirmando(true);
    setMensaje(null);
    const r = await confirmBoardingAction(resultado.reservation.reservationId, [...seleccionados]);
    if (r.error) {
      setMensaje(r.error);
    } else {
      setMensaje("Grupo abordado correctamente.");
      setResultado(null);
      setCode("");
    }
    setConfirmando(false);
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void buscar(code);
        }}
        className="flex flex-col gap-2"
      >
        <label className="flex flex-col gap-1 text-sm font-medium">
          Serial del ticket
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-3 text-base uppercase"
            placeholder="TR-0910-2PAX-AB12"
            autoCapitalize="characters"
          />
        </label>
        <button
          type="submit"
          disabled={buscando}
          className="rounded-lg bg-[var(--color-acento)] px-4 py-3 text-base font-medium text-white disabled:opacity-60"
        >
          {buscando ? "Buscando…" : "Buscar"}
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {camaraDisponible ? (
          <button
            type="button"
            onClick={() => (camaraActiva ? detenerCamara() : void iniciarCamara())}
            className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 py-3 text-base font-medium"
          >
            {camaraActiva ? "Detener cámara" : "Escanear QR con la cámara"}
          </button>
        ) : (
          <p className="rounded-lg bg-[var(--color-acento-suave)] px-4 py-3 text-sm text-[var(--color-texto-suave)]">
            Este navegador no admite lectura de QR con la cámara. Escribe el serial manualmente.
          </p>
        )}
        <video ref={videoRef} hidden={!camaraActiva} muted playsInline className="w-full rounded-lg border border-[var(--color-borde)]" />
      </div>

      {mensaje ? <p className="text-sm font-medium text-[var(--color-peligro)]">{mensaje}</p> : null}
      {resultado?.error ? (
        <p className="text-sm font-medium text-[var(--color-peligro)]">{resultado.error}</p>
      ) : null}

      {resultado?.reservation ? (
        <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4">
          <p className="font-medium">{resultado.reservation.code}</p>
          <p className="text-sm text-[var(--color-texto-suave)]">{resultado.reservation.holderName}</p>
          <p className="tabular mt-1 text-sm">
            Saldo: {resultado.reservation.balanceUsd} · Estado: {resultado.reservation.status}
          </p>

          <ul className="mt-3 flex flex-col gap-2">
            {resultado.reservation.passengers.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-lg border border-[var(--color-borde)] px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={seleccionados.has(p.id)}
                  onChange={() => alternar(p.id)}
                  disabled={p.boardedAt !== null}
                  className="h-5 w-5"
                />
                <div>
                  <p className="text-sm font-medium">{p.fullName}</p>
                  <p className="text-xs text-[var(--color-texto-suave)]">
                    {p.idNumber}
                    {p.boardedAt ? " · ya abordó" : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => void abordarGrupo()}
            disabled={confirmando || seleccionados.size === 0}
            className="mt-4 w-full rounded-lg bg-[var(--color-exito)] px-4 py-3 text-base font-medium text-white disabled:opacity-60"
          >
            {confirmando ? "Registrando…" : "Abordar grupo"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
