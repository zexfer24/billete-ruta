import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { listDocuments } from "@/modules/accounts";
import { requirePassenger } from "@/modules/auth";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale/es";
import { BUSINESS_TZ, formatCaracasTime24 } from "@/lib/time";
import { whenPhrase } from "@/components/passenger-copy";
import { Alert } from "@/components/alert";
import { ClearFeedbackParams } from "@/components/clear-feedback-params";
import { FileField } from "@/components/file-field";
import { IconCheckCircle, IconChevronDown, IconDocument, IconShield, IconUser } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, Card, Pill, type PillTone } from "@/components/ui";
import { subirDocumentoAction } from "./actions";
import {
  DOCUMENT_ERROR_MESSAGES,
  DOCUMENT_OK_CODES,
  DOCUMENT_OK_MESSAGES,
  documentCodeSchema,
  documentErrorSchema,
  volverSchema,
  type DocumentosVolver,
} from "./shared";

export const metadata: Metadata = {
  title: "Mis documentos",
};

const ETIQUETAS: Record<string, string> = {
  CEDULA: "Foto de cédula",
  PERMISO_VIAJE: "Permiso de viaje",
  FOTO_PERFIL: "Foto de perfil",
};

/** Solo códigos conocidos: un valor inventado se ignora en vez de mostrarse o tumbar la pantalla. */
const paramsSchema = z.object({
  ok: documentCodeSchema,
  error: documentErrorSchema,
  doc: documentCodeSchema,
  volver: volverSchema,
});

type Documento = Awaited<ReturnType<typeof listDocuments>>[number];

/**
 * "Guardada hoy a las 09:13", "Guardada ayer a las 19:00" o "Guardada el vie
 * 3 jul a las 01:14": el mismo formato de día y hora del resto de la app
 * (`whenPhrase`). Una foto de otro año agrega el año ("el vie 3 jul de 2025 a
 * las 01:14"), para no confundirla con una reciente. Nunca "03/07/2026".
 */
function guardadoEl(date: Date, now: Date = new Date()): string {
  const frase = whenPhrase(date, now);
  const mismoAno = formatInTimeZone(date, BUSINESS_TZ, "yyyy") === formatInTimeZone(now, BUSINESS_TZ, "yyyy");
  if (mismoAno || !frase.startsWith("el ")) return `Guardada ${frase}`;
  const dia = formatInTimeZone(date, BUSINESS_TZ, "EEE d MMM 'de' yyyy", { locale: es });
  return `Guardada el ${dia} a las ${formatCaracasTime24(date)}`;
}

/**
 * Documentos del pasajero: una tarjeta por documento con su estado y la foto
 * vigente. Solo lo que falta muestra su formulario abierto; lo ya guardado
 * (y el permiso, que es opcional) lo guarda detrás de un botón para no
 * llenar la pantalla de zonas de subida. Con la cédula guardada, la tarjeta
 * dice que ya se puede reservar y lleva al asistente (o de vuelta a la
 * reserva en curso si la persona llegó desde ahí).
 */
export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const pasajero = await requirePassenger();
  const parsed = paramsSchema.safeParse(await searchParams);
  const params = parsed.success
    ? parsed.data
    : { ok: undefined, error: undefined, doc: undefined, volver: undefined };
  const documentos = await listDocuments(pasajero.id);

  // listDocuments viene del más reciente al más antiguo: el primero de cada tipo es el vigente.
  const cedula = documentos.find((doc) => doc.type === "CEDULA") ?? null;
  const permiso = documentos.find((doc) => doc.type === "PERMISO_VIAJE") ?? null;
  const perfil = documentos.find((doc) => doc.type === "FOTO_PERFIL") ?? null;
  const anteriores = documentos.filter(
    (doc) => doc.id !== cedula?.id && doc.id !== permiso?.id && doc.id !== perfil?.id,
  );
  const okMessage = params.ok ? DOCUMENT_OK_MESSAGES[params.ok] : undefined;
  const errorMessage = params.error ? DOCUMENT_ERROR_MESSAGES[params.error] : undefined;
  // Tras guardar viniendo de la reserva, el aviso ya trae "Volver a mi reserva": la tarjeta no lo repite.
  const avisoLlevaAReserva = Boolean(okMessage) && params.volver === "reservar";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Mis documentos</h1>
        <p className="leading-relaxed text-tinta-suave">
          Para reservar necesitas la foto de tu cédula. Si viaja un menor de edad, también su
          permiso de viaje. La foto de perfil es opcional.
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
            : params.ok === DOCUMENT_OK_CODES.FOTO_PERFIL
              ? "Ayuda al personal a reconocerte al abordar."
              : "Ya puedes usarla para reservar."}
        </Alert>
      ) : null}
      {errorMessage ? (
        <Alert tone="peligro" title="No se pudo guardar la foto">
          {errorMessage}
        </Alert>
      ) : null}
      {okMessage || errorMessage ? <ClearFeedbackParams /> : null}

      <DocumentoCard
        tipo="CEDULA"
        titulo="Foto de tu cédula"
        descripcion="Obligatoria para confirmar cualquier reserva."
        consejoFoto="Toma la foto del frente, con buena luz y sin reflejos."
        obligatorio
        documento={cedula}
        volver={params.volver}
        principal={!cedula}
        abierto={Boolean(errorMessage) && params.doc === DOCUMENT_OK_CODES.CEDULA}
        listo={cedula && !avisoLlevaAReserva ? { volver: params.volver } : null}
      />
      <DocumentoCard
        tipo="FOTO_PERFIL"
        titulo="Foto de perfil"
        descripcion="Una foto de tu rostro, de frente y sin lentes oscuros. Ayuda al personal a reconocerte al abordar."
        vacio="Todavía no subiste una foto de perfil."
        consejoFoto="De frente y con buena luz."
        obligatorio={false}
        documento={perfil}
        volver={params.volver}
        principal={false}
        abierto={Boolean(errorMessage) && params.doc === DOCUMENT_OK_CODES.FOTO_PERFIL}
        listo={null}
        capture="user"
      />
      <DocumentoCard
        tipo="PERMISO_VIAJE"
        titulo="Permiso de viaje"
        descripcion="Solo hace falta si en tu grupo viaja un menor de edad."
        consejoFoto="Que se lean bien los datos."
        obligatorio={false}
        documento={permiso}
        volver={params.volver}
        principal={false}
        abierto={Boolean(errorMessage) && params.doc === DOCUMENT_OK_CODES.PERMISO_VIAJE}
        listo={null}
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
  tipo: "CEDULA" | "PERMISO_VIAJE" | "FOTO_PERFIL";
  titulo: string;
  descripcion: string;
  /** Texto que se ve mientras el documento no está guardado (opcional). */
  vacio?: string;
  /** Cámara preferida del teléfono al tomar la foto: `user` es la frontal. */
  capture?: "environment" | "user";
  /** Cómo tomar la foto: va con el campo de subida, no a la vista cuando el documento ya está guardado. */
  consejoFoto: string;
  obligatorio: boolean;
  documento: Documento | null;
  volver: DocumentosVolver;
  /** Solo un botón morado relleno por pantalla: el de la cédula mientras falte. */
  principal: boolean;
  /** Deja abierto el formulario plegado, por ejemplo tras un error al subir este documento. */
  abierto: boolean;
  /** Con la cédula guardada: frase de "ya puedes reservar" y el enlace al asistente. */
  listo: { volver: DocumentosVolver } | null;
}

/**
 * Tarjeta de un documento: estado, foto vigente y formulario para subirla o
 * cambiarla. Las indicaciones para tomar la foto van con el campo de subida:
 * con el documento guardado solo se ven al desplegar "Cambiar la foto". El formulario va abierto solo si el documento es obligatorio y
 * falta; si no, se despliega con "Cambiar la foto" o "Subir el permiso de
 * viaje" (un `<details>` nativo: sin JavaScript y con teclado).
 */
function DocumentoCard({
  tipo,
  titulo,
  descripcion,
  vacio,
  capture,
  consejoFoto,
  obligatorio,
  documento,
  volver,
  principal,
  abierto,
  listo,
}: DocumentoCardProps) {
  const cargado = documento !== null;
  const tono: PillTone = cargado ? "exito" : obligatorio ? "alerta" : "neutro";
  const estado = cargado ? "Guardada" : obligatorio ? "Falta" : "Opcional";
  const headingId = `doc-${tipo.toLowerCase()}`;
  const fileId = `archivo-${tipo.toLowerCase()}`;
  const nombreCorto = tipo === "CEDULA" ? "de la cédula" : tipo === "FOTO_PERFIL" ? "de perfil" : "del permiso";
  const perfil = tipo === "FOTO_PERFIL";
  const plegado = cargado || !obligatorio;
  // Con la cédula guardada, "Obligatoria para…" ya no dice nada: la tarjeta dice que está lista.
  const muestraDescripcion = !cargado || !obligatorio;

  const formulario = (
    <form action={subirDocumentoAction} className="flex flex-col gap-4">
      <input type="hidden" name="type" value={tipo} />
      {volver ? <input type="hidden" name="volver" value={volver} /> : null}
      <FileField
        id={fileId}
        name="file"
        label={cargado ? `Nueva foto ${nombreCorto}` : `Foto ${nombreCorto}`}
        buttonLabel={
          cargado ? "Tomar o elegir otra foto" : perfil ? "Tomar o elegir foto" : "Tomar o elegir la foto"
        }
        capture={capture}
        maxSizeMb={5}
        accept="image/jpeg,image/png,image/webp"
        hint={`${consejoFoto} JPG, PNG o WebP de hasta 5 MB.`}
        required
      />
      <SubmitButton
        pendingLabel="Subiendo la foto…"
        className={buttonClass(principal ? "primario" : "secundario", "w-full")}
      >
        {cargado ? "Guardar la foto nueva" : "Guardar la foto"}
      </SubmitButton>
    </form>
  );

  return (
    <section aria-labelledby={headingId}>
      <Card className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-50 text-marca-600"
          >
            {perfil ? <IconUser className="size-5" /> : <IconDocument className="size-5" />}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 id={headingId} className="text-lg font-semibold text-tinta">
                {titulo}
              </h2>
              <Pill tone={tono}>{estado}</Pill>
            </div>
            {muestraDescripcion ? <p className="leading-relaxed text-tinta-suave">{descripcion}</p> : null}
            {!cargado && vacio ? <p className="leading-relaxed text-tinta-suave">{vacio}</p> : null}
          </div>
        </div>

        {documento ? (
          <div className="flex flex-col gap-2">
            <FotoDocumento documento={documento} />
            <p className="tabular text-sm text-tinta-suave">{guardadoEl(documento.uploadedAt)}</p>
          </div>
        ) : null}

        {listo ? (
          <div className="flex flex-col gap-3">
            <p className="flex items-start gap-2 font-semibold text-exito">
              <IconCheckCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              Tu cédula está lista. Ya puedes reservar.
            </p>
            <Link href="/mi/reservar" className={buttonClass("primario", "w-full")}>
              {listo.volver === "reservar" ? "Volver a mi reserva" : "Reservar un viaje"}
            </Link>
          </div>
        ) : null}

        {plegado ? (
          <details open={abierto} className="group">
            <summary
              className={buttonClass(
                cargado ? "fantasma" : "secundario",
                cargado
                  ? "-ml-3 w-fit list-none [&::-webkit-details-marker]:hidden"
                  : "w-full list-none [&::-webkit-details-marker]:hidden",
              )}
            >
              {cargado ? "Cambiar la foto" : perfil ? "Subir la foto de perfil" : `Subir el ${titulo.toLowerCase()}`}
              <IconChevronDown
                aria-hidden="true"
                className="size-5 shrink-0 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <div className="pt-4">{formulario}</div>
          </details>
        ) : (
          formulario
        )}
      </Card>
    </section>
  );
}
