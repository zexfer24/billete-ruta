import Link from "next/link";
import type { ReactNode } from "react";
import { IconAlertCircle, IconCheckCircle, IconMessage, IconXCircle } from "@/components/icons";
import { panelButtonClass } from "@/components/panel-ui";
import { Pill } from "@/components/ui";
import type { StatusTone } from "@/lib/labels";
import type { PassengerProfile } from "@/modules/reports";
import { formatPhone } from "../../_shared/format";
import { withQuery } from "../../_shared/period";
import { accountStatusBadges, initialsOf } from "./profile-format";

const BADGE_ICONS: Partial<Record<StatusTone, ReactNode>> = {
  exito: <IconCheckCircle />,
  alerta: <IconAlertCircle />,
  peligro: <IconXCircle />,
};

/**
 * Foto de perfil vigente o, si no hay, un círculo con las iniciales y la
 * leyenda "Sin foto de perfil". 64 px en el teléfono y 96 px desde `sm`.
 */
function Avatar({
  fullName,
  givenNames,
  surnames,
  photoPath,
}: {
  fullName: string;
  givenNames: string;
  surnames: string;
  photoPath: string | null;
}) {
  const size = "size-16 sm:size-24";
  return (
    <div className="flex shrink-0 items-center gap-3 sm:w-24 sm:flex-col sm:gap-2">
      {photoPath ? (
        // La imagen se sirve con control de acceso desde /api/archivos: next/image no puede optimizarla.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/archivos/${photoPath}`}
          alt={`Foto de perfil de ${fullName}`}
          className={`${size} shrink-0 rounded-full border border-borde bg-lienzo object-cover`}
        />
      ) : (
        <>
          <span
            aria-hidden="true"
            className={`${size} grid shrink-0 place-items-center rounded-full bg-marca-100 text-xl font-bold text-marca-700 sm:text-3xl`}
          >
            {initialsOf(givenNames, surnames)}
          </span>
          <p className="text-sm text-tinta-suave sm:text-center sm:text-xs">Sin foto de perfil</p>
        </>
      )}
    </div>
  );
}

/**
 * Cabecera del perfil: avatar, nombre (`h1`), cédula y teléfono completos, las
 * pastillas de estado de la cuenta y el acceso a sus mensajes.
 */
export function ProfileHeader({ profile }: { profile: PassengerProfile }) {
  const { account, documents } = profile;
  const badges = accountStatusBadges(account);

  return (
    <header className="flex flex-col gap-4 rounded-tarjeta border border-borde bg-superficie p-5 shadow-1 sm:flex-row sm:items-start sm:gap-6">
      <Avatar
        fullName={account.fullName}
        givenNames={account.givenNames}
        surnames={account.surnames}
        photoPath={documents.profilePhoto.current?.filePath ?? null}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="min-w-0">
          <h1 className="text-balance break-words text-2xl font-bold tracking-tight text-tinta sm:text-3xl">
            {account.fullName}
          </h1>
          <p className="tabular mt-1 text-base text-tinta-suave">
            <span className="whitespace-nowrap">Cédula {account.idNumber}</span>
            {" · "}
            <span className="whitespace-nowrap">{formatPhone(account.phone)}</span>
          </p>
        </div>

        <ul aria-label="Estado de la cuenta" className="flex flex-wrap items-center gap-2">
          {badges.map((badge) => (
            <li key={badge.label}>
              <Pill tone={badge.tone} icon={BADGE_ICONS[badge.tone]}>
                {badge.label}
              </Pill>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2">
          <Link
            href={withQuery("/panel/admin/mensajes", { q: account.phone })}
            className={panelButtonClass("secundario")}
          >
            <IconMessage className="size-5 shrink-0" />
            Ver mensajes
            <span className="sr-only"> de {account.fullName}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
