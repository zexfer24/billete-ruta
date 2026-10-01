import Link from "next/link";
import type { ComponentType } from "react";
import type { Notice, NoticeLevel } from "@/modules/notices";
import { IconCheckCircle, IconChevronRight, IconInfo, IconWarning, type IconProps } from "./icons";
import { noticeActionLabel, noticeTimeLabel } from "./passenger-copy";
import { cx } from "./ui-classes";

interface NoticeCardProps {
  notice: Notice;
  /** Instante de referencia para decir "hoy" o "mañana"; por defecto, ahora. */
  now?: Date;
}

const LEVEL_STYLES: Record<
  NoticeLevel,
  { Icon: ComponentType<IconProps>; circle: string; label: string }
> = {
  alerta: { Icon: IconWarning, circle: "bg-alerta-suave text-alerta", label: "Atención" },
  info: { Icon: IconInfo, circle: "bg-info-suave text-info", label: "Información" },
  exito: { Icon: IconCheckCircle, circle: "bg-exito-suave text-exito", label: "Listo" },
};

/**
 * Aviso del pasajero (spec 6.3 y 7.1): icono del nivel en un círculo de su
 * color, título, una o dos frases, la hora con su significado ("Vence hoy a
 * las 14:30") y, si lleva a otra pantalla, la acción escrita ("Pagar mi viaje").
 * El nivel se dice también en texto para lectores de pantalla: el color
 * nunca va solo.
 */
export function NoticeCard({ notice, now = new Date() }: NoticeCardProps) {
  const { Icon, circle, label } = LEVEL_STYLES[notice.level];
  const timeLabel = noticeTimeLabel(notice, now);

  const content = (
    <>
      <div className="flex gap-3">
        <span aria-hidden="true" className={cx("grid size-10 shrink-0 place-items-center rounded-full", circle)}>
          <Icon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-pretty font-bold leading-snug text-tinta">
            <span className="sr-only">{label}: </span>
            {notice.title}
          </p>
          <p className="leading-relaxed text-tinta">{notice.body}</p>
          {timeLabel ? <p className="tabular text-sm font-medium text-tinta-suave">{timeLabel}</p> : null}
        </div>
      </div>
      {notice.href ? (
        <p className="mt-3 flex min-h-6 items-center justify-between gap-2 border-t border-borde pt-3 font-semibold text-marca-700">
          <span>{noticeActionLabel(notice.kind)}</span>
          <IconChevronRight aria-hidden="true" className="shrink-0" />
        </p>
      ) : null}
    </>
  );

  const shell = "block rounded-tarjeta border border-borde bg-superficie p-4 shadow-1";

  if (notice.href) {
    return (
      <Link
        href={notice.href}
        className={cx(
          shell,
          "foco transition-shadow duration-150 ease-out hover:shadow-2 motion-reduce:transition-none",
        )}
      >
        {content}
      </Link>
    );
  }

  return <div className={shell}>{content}</div>;
}
