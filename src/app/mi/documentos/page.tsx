import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { listDocuments } from "@/modules/accounts";
import { requirePassenger } from "@/modules/auth";
import { formatCaracasDate, formatCaracasTime24 } from "@/lib/time";
import { Alert } from "@/components/alert";
import { ClearFeedbackParams } from "@/components/clear-feedback-params";
import { FileField } from "@/components/file-field";
import { IconChevronDown, IconDocument, IconShield } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, Card, Pill, type PillTone } from "@/components/ui";
import { subirDocumentoAction } from "./actions";
import { DOCUMENT_OK_MESSAGES, volverSchema, type DocumentosVolver } from "./shared";

export const metadata: Metadata = {
  title: "Mis documentos",
};

const ETIQUETAS: Record<string, string> = {
  CEDULA: "Foto de cédula",
  PERMISO_VIAJE: "Permiso de viaje",
};

const paramsSchema = z.object({
  ok: z.string().max(40).optional().catch(undefined),
  error: z.string().max(300).optional().catch(undefined),
  volver: volverSchema,
});

type Documento = Awaited<ReturnType<typeof listDocuments>>[number];

function guardadoEl(date: Date): string {
  return `Guardada el ${formatCaracasDate(date)} a las ${formatCaracasTime24(date)}`;
}

/**
 * Documentos del pasajero: una tarjeta por documento con su estado, la foto
 * vigente y su propio formulario para subirla o cambiarla (sin elegir el
 * tipo en una lista). Si la persona llegó desde el asistente de reserva, al
 * guardar se le ofrece volver a él, donde la reserva en curso sigue guardada.
 */
export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const pasajero = await requirePassenger();
  const parsed = paramsSchema.safeParse(await searchParams);
  const params = parsed.success ? parsed.data : { ok: undefined, error: undefined, volver: undefined };
  const documentos = await listDocuments(pasajero.id);

  // listDocuments viene del más reciente al más antiguo: el primero de cada tipo es el vigente.
  const cedula = documentos.find((doc) => doc.type === "CEDULA") ?? null;
  const permiso = documentos.find((doc) => doc.type === "PERMISO_VIAJE") ?? null;
  const anteriores = documentos.filter((doc) => doc.id !== cedula?.id && doc.id !== permiso?.id);
  const okMessage = params.ok ? DOCUMENT_OK_MESSAGES[params.ok] : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Mis documentos</h1>
        <p className="leading-relaxed text-tinta-suave">
          Para reservar necesitas la foto de tu cédula. Si viaja un menor de edad, también su
          permiso de viaje.
        </p>
      </div>

      {okMessage ? (
        <Alert
          tone="exito"
          title={okMessage}
          action={
            params.volver === "reservar" ? (
              <Link href="/mi/reservar" className={buttonClass("primario", undefined, "sm")}>
                Volver a mi reserva
              </Link>
            ) : undefined
          }
        >
          {params.volver === "reservar"
            ? "Tu reserva en curso sigue guardada: puedes seguir donde la dejaste."
            : "Ya puedes usarla para reservar."}
        </Alert>
      ) : null}
      {params.error ? (
        <Alert tone="peligro" title="No se pudo guardar la foto">
          {params.error}
        </Alert>
      ) : null}
      {okMessage || params.error ? <ClearFeedbackParams /> : null}

      <DocumentoCard
        tipo="CEDULA"
        titulo="Foto de tu cédula"
        descripcion="Obligatoria para confirmar cualquier reserva. Toma la foto del frente, con buena luz y sin reflejos."
        obligatorio
        documento={cedula}
        volver={params.volver}
        principal={!cedula}
      />
      <DocumentoCard
        tipo="PERMISO_VIAJE"
        titulo="Permiso de viaje"
        descripcion="Solo hace falta si en tu grupo viaja un menor de edad."
        obligatorio={false}
        documento={permiso}
        volver={params.volver}
        principal={false}
      />

      <p className="flex items-start gap-2 text-sm leading-relaxed text-tinta-suave">
        <IconShield aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Usamos tus fotos solo para verificar tu identidad en el terminal y al abordar.
      </p>

      {anteriores.length > 0 ? (
        <details className="group rounded-tarjeta border border-borde bg-superficie shadow-1">
          <summary className="foco flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-tarjeta px-5 py-3 font-semibold text-marca-700">
            {anteriores.length === 1 ? "Ver la foto que subiste antes" : `Ver las ${anteriores.length} fotos que subiste antes`}
            <IconChevronDown
              aria-hidden="true"
              className="shrink-0 text-tinta-suave transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <ul className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
            {anteriores.map((doc) => (
              <li key={doc.id} className="flex flex-col gap-2">
                <p className="font-semibold text-tinta">{ETIQUETAS[doc.type] ?? "Documento"}</p>
                <p className="tabular text-sm text-tinta-suave">{guardadoEl(doc.uploadedAt)}</p>
                <FotoDocumento documento={doc} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function FotoDocumento({ documento }: { documento: Documento }) {
  return (
    // La imagen se sirve con control de acceso desde /api/archivos: next/image no puede optimizarla.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/archivos/${documento.filePath}`}
      alt={ETIQUETAS[documento.type] ?? "Documento"}
      className="max-h-48 w-full rounded-control border border-borde bg-lienzo object-contain"
    />
  );
}

interface DocumentoCardProps {
  tipo: "CEDULA" | "PERMISO_VIAJE";
  titulo: string;
  descripcion: string;
  obligatorio: boolean;
  documento: Documento | null;
  volver: DocumentosVolver;
  /** Solo un botón morado relleno por pantalla: el de la cédula mientras falte. */
  principal: boolean;
}

/** Tarjeta de un documento: estado, foto vigente y formulario para subirla o cambiarla. */
function DocumentoCard({
  tipo,
  titulo,
  descripcion,
  obligatorio,
  documento,
  volver,
  principal,
}: DocumentoCardProps) {
  const cargado = documento !== null;
  const tono: PillTone = cargado ? "exito" : obligatorio ? "alerta" : "neutro";
  const estado = cargado ? "Guardada" : obligatorio ? "Falta" : "Opcional";
  const headingId = `doc-${tipo.toLowerCase()}`;
  const fileId = `archivo-${tipo.toLowerCase()}`;
  const nombreCorto = tipo === "CEDULA" ? "de la cédula" : "del permiso";

  return (
    <section aria-labelledby={headingId}>
      <Card className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-50 text-marca-600"
          >
            <IconDocument className="size-5" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 id={headingId} className="text-lg font-semibold text-tinta">
                {titulo}
              </h2>
              <Pill tone={tono}>{estado}</Pill>
            </div>
            <p className="leading-relaxed text-tinta-suave">{descripcion}</p>
          </div>
        </div>

        {documento ? (
          <div className="flex flex-col gap-2">
            <FotoDocumento documento={documento} />
            <p className="tabular text-sm text-tinta-suave">{guardadoEl(documento.uploadedAt)}</p>
          </div>
        ) : null}

        <form action={subirDocumentoAction} className="flex flex-col gap-4">
          <input type="hidden" name="type" value={tipo} />
          {volver ? <input type="hidden" name="volver" value={volver} /> : null}
          <FileField
            id={fileId}
            name="file"
            label={cargado ? `Nueva foto ${nombreCorto}` : `Foto ${nombreCorto}`}
            buttonLabel={cargado ? "Tomar o elegir otra foto" : "Tomar o elegir la foto"}
            maxSizeMb={5}
            accept="image/jpeg,image/png,image/webp"
            hint="Que se lean bien los datos. JPG, PNG o WebP de hasta 5 MB."
            required
          />
          <SubmitButton
            pendingLabel="Subiendo la foto…"
            className={buttonClass(principal ? "primario" : "secundario", "w-full")}
          >
            {cargado ? "Guardar la foto nueva" : "Guardar la foto"}
          </SubmitButton>
        </form>
      </Card>
    </section>
  );
}
