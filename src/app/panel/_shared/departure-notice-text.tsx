import { IconClock, IconWarning } from "@/components/icons";
import { noticeTextNoBreak, type DepartureNotice } from "./departure-notice";

/**
 * Aviso de tiempo junto a la pastilla de estado de una salida: "Debía salir a
 * las 13:00" (atrasada, mismas palabras que el tablero) o "Sale en 15 min".
 * Con icono y texto, nunca solo color. Lo usan la lista de salidas y la hoja.
 */
export function DepartureNoticeText({ aviso }: { aviso: DepartureNotice }) {
  const Icon = aviso.kind === "atrasada" ? IconWarning : IconClock;
  return (
    <p className="tabular flex items-start gap-1.5 text-sm font-semibold text-alerta">
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{noticeTextNoBreak(aviso.text)}</span>
    </p>
  );
}
