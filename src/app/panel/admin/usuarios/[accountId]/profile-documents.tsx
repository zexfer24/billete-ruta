import type { ReactNode } from "react";
import { IconCamera, IconCheckCircle, IconClock, IconDocument, IconUser } from "@/components/icons";
import { EmptyState } from "@/components/panel-ui";
import { Pill } from "@/components/ui";
import type { PassengerProfile, ProfileDocument, ProfileDocumentGroup } from "@/modules/reports";
import { dateTimePhrase } from "../../_shared/format";
import { DISCLOSURE_SUMMARY_CLASS, DisclosureChevron } from "../../_shared/lists";
import { documentStatus, previousDocumentsLabel } from "./profile-format";
import { ProfileCard, ProfileSection } from "./profile-section";

/** Miniatura que abre la imagen a tamaño completo en otra pestaña. */
function DocumentThumb({ document, noun, className }: { document: ProfileDocument; noun: string; className?: string }) {
  return (
    <a
      href={`/api/archivos/${document.filePath}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`foco block rounded-control ${className ?? ""}`}
    >
      {/* La imagen se sirve con control de acceso desde /api/archivos: next/image no puede optimizarla.
          El nombre accesible del enlace es su texto oculto: la imagen es decorativa. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/archivos/${document.filePath}`}
        alt=""
        loading="lazy"
        className="aspect-[4/3] w-full rounded-control border border-borde bg-lienzo object-cover"
      />
      <span className="sr-only">Abrir {noun} en tamaño completo (se abre en otra pestaña)</span>
    </a>
  );
}

/** "Cargada el 20/10/2026 a las 14:25" y el estado de verificación con icono. */
function DocumentMeta({ document }: { document: ProfileDocument }) {
  const status = documentStatus(document.verifiedAt);
  return (
    <>
      <p className="tabular text-sm text-tinta-suave">Cargada {dateTimePhrase(document.uploadedAt)}</p>
      <Pill tone={status.tone} icon={document.verifiedAt ? <IconCheckCircle /> : <IconClock />}>
        {status.label}
      </Pill>
    </>
  );
}

/** Fila compacta (miniatura a la izquierda, datos a la derecha) para anteriores y permisos. */
function CompactDocument({ document, noun }: { document: ProfileDocument; noun: string }) {
  return (
    <li className="flex items-start gap-3">
      <DocumentThumb document={document} noun={noun} className="w-24 shrink-0 sm:w-28" />
      <div className="flex min-w-0 flex-col items-start gap-1.5">
        <DocumentMeta document={document} />
      </div>
    </li>
  );
}

function DocumentColumn({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="flex min-w-0 flex-col gap-3">
      <h3 className="flex items-center gap-2 text-base font-semibold text-tinta">
        <span aria-hidden="true" className="text-marca-600 [&>svg]:size-5">
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </li>
  );
}

/** Documento vigente (grande) y, si hay, sus versiones anteriores plegadas. */
function GroupBody({
  group,
  noun,
  emptyTitle,
  emptyIcon,
}: {
  group: ProfileDocumentGroup;
  noun: string;
  emptyTitle: string;
  emptyIcon: ReactNode;
}) {
  if (!group.current) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} className="px-4 py-8" />;
  }
  return (
    <>
      <div className="flex flex-col items-start gap-2">
        <DocumentThumb document={group.current} noun={noun} className="w-full" />
        <DocumentMeta document={group.current} />
      </div>
      {group.previous.length > 0 ? (
        <details className="group">
          <summary className={DISCLOSURE_SUMMARY_CLASS}>
            {previousDocumentsLabel(group.previous.length)}
            <DisclosureChevron />
          </summary>
          <ul className="mt-2 flex flex-col gap-4">
            {group.previous.map((document) => (
              <CompactDocument key={document.id} document={document} noun={`${noun} anterior`} />
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}

/**
 * "Documentos": foto de perfil, cédula y permisos de viaje con menores. Cada
 * imagen se abre a tamaño completo en otra pestaña.
 */
export function ProfileDocuments({ documents }: { documents: PassengerProfile["documents"] }) {
  const { profilePhoto, cedula, travelPermits } = documents;

  return (
    <ProfileSection id="documentos" title="Documentos">
      <ProfileCard>
        <ul className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
          <DocumentColumn title="Foto de perfil" icon={<IconUser />}>
            <GroupBody
              group={profilePhoto}
              noun="la foto de perfil"
              emptyTitle="No ha subido foto de perfil."
              emptyIcon={<IconCamera />}
            />
          </DocumentColumn>

          <DocumentColumn title="Cédula" icon={<IconDocument />}>
            <GroupBody
              group={cedula}
              noun="la cédula"
              emptyTitle="No hay foto de cédula."
              emptyIcon={<IconDocument />}
            />
          </DocumentColumn>

          <DocumentColumn title="Permisos de viaje con menores" icon={<IconDocument />}>
            {travelPermits.length === 0 ? (
              <EmptyState
                icon={<IconDocument />}
                title="No tiene permisos de viaje cargados."
                className="px-4 py-8"
              />
            ) : (
              <ul className="flex flex-col gap-4">
                {travelPermits.map((document) => (
                  <CompactDocument key={document.id} document={document} noun="el permiso de viaje" />
                ))}
              </ul>
            )}
          </DocumentColumn>
        </ul>
      </ProfileCard>
    </ProfileSection>
  );
}
