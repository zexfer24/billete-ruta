import Link from "next/link";
import type { Notice } from "@/modules/notices";
import { formatCaracasDateTime24 } from "@/lib/time";
import { IconBell, IconCheck, IconChevronRight, IconWarning } from "./icons";

interface NoticeCardProps {
  notice: Notice;
}

const ESTILO_POR_NIVEL = {
  alerta: { Icon: IconWarning, tono: "text-alerta" },
  info: { Icon: IconBell, tono: "text-marca" },
  exito: { Icon: IconCheck, tono: "text-exito" },
} as const;

/** Tarjeta de aviso con icono, título y cuerpo según el nivel (`alerta`, `info`, `exito`). */
export function NoticeCard({ notice }: NoticeCardProps) {
  const { Icon, tono } = ESTILO_POR_NIVEL[notice.level];

  const contenido = (
    <>
      <Icon aria-hidden="true" className={`shrink-0 ${tono}`} />
      <div className="min-w-0 flex-1">
        <p className={`font-bold ${tono}`}>{notice.title}</p>
        <p className="mt-0.5 text-tinta">{notice.body}</p>
        <p className="mt-1 text-sm text-tinta-suave">{formatCaracasDateTime24(notice.at)}</p>
      </div>
      {notice.href ? (
        <IconChevronRight aria-hidden="true" className="shrink-0 self-center text-tinta-suave" />
      ) : null}
    </>
  );

  if (notice.href) {
    return (
      <Link
        href={notice.href}
        className="flex gap-3 rounded-tarjeta bg-white p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca"
      >
        {contenido}
      </Link>
    );
  }

  return <div className="flex gap-3 rounded-tarjeta bg-white p-4">{contenido}</div>;
}
