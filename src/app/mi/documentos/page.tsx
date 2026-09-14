import { listDocuments } from "@/modules/accounts";
import { requirePassenger } from "@/modules/auth";
import { formatCaracasDateTime24 } from "@/lib/time";
import type { StatusTone } from "@/lib/labels";
import { buttonClass, Card, Pill } from "@/components/ui";
import { IconDocument } from "@/components/icons";
import { subirDocumentoAction } from "./actions";

const ETIQUETAS: Record<string, string> = {
  CEDULA: "Foto de cédula",
  PERMISO_VIAJE: "Permiso de viaje",
};

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const pasajero = await requirePassenger();
  const params = await searchParams;
  const documentos = await listDocuments(pasajero.id);

  const cedula = documentos.find((doc) => doc.type === "CEDULA") ?? null;
  const permiso = documentos.find((doc) => doc.type === "PERMISO_VIAJE") ?? null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-tinta">Mis documentos</h1>
        <p className="mt-1 text-tinta-suave">
          La foto de tu cédula es obligatoria para concretar una reserva. El permiso de viaje solo
          hace falta si en el grupo viaja un menor de edad.
        </p>
      </div>

      {params.error ? (
        <div role="alert" className="rounded-tarjeta border border-peligro bg-white p-5 text-peligro shadow-sm">
          {params.error}
        </div>
      ) : null}
      {params.ok ? (
        <div role="status" className="rounded-tarjeta border border-exito bg-white p-5 text-exito shadow-sm">
          Documento cargado correctamente.
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <TarjetaEstado titulo="Foto de cédula" obligatorio documento={cedula} />
        <TarjetaEstado titulo="Permiso de viaje" obligatorio={false} documento={permiso} />
      </section>

      <Card>
        <h2 className="font-bold text-tinta">Cargar documento</h2>
        <form action={subirDocumentoAction} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-tinta">Tipo de documento</span>
            <select
              name="type"
              required
              defaultValue="CEDULA"
              className="min-h-11 rounded-xl border border-borde bg-white px-4 text-base text-tinta focus:border-marca focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca motion-reduce:transition-none"
            >
              <option value="CEDULA">Foto de cédula</option>
              <option value="PERMISO_VIAJE">Permiso de viaje</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-tinta">Archivo</span>
            <input
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="min-h-11 rounded-xl border border-borde px-4 py-2 text-base text-tinta file:mr-3 file:rounded-pastilla file:border-0 file:bg-marca-clara file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-marca-oscura focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca motion-reduce:transition-none"
            />
            <span className="text-sm text-tinta-suave">JPG, PNG o WebP de hasta 5 MB</span>
          </label>
          <button type="submit" className={buttonClass("primario")}>
            Cargar documento
          </button>
        </form>
      </Card>

      {documentos.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-tinta-suave">
            Documentos cargados
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {documentos.map((doc) => (
              <Card key={doc.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <IconDocument aria-hidden="true" className="shrink-0 text-marca" />
                  <p className="font-bold text-tinta">{ETIQUETAS[doc.type] ?? doc.type}</p>
                </div>
                <p className="text-sm text-tinta-suave">
                  Cargado el {formatCaracasDateTime24(doc.uploadedAt)}
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/archivos/${doc.filePath}`}
                  alt={ETIQUETAS[doc.type] ?? doc.type}
                  className="mt-1 max-h-48 w-full rounded-xl border border-borde object-contain"
                />
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

interface TarjetaEstadoProps {
  titulo: string;
  obligatorio: boolean;
  documento: { uploadedAt: Date } | null;
}

/** Tarjeta de estado de un tipo de documento, con borde e icono según si falta o está cargado. */
function TarjetaEstado({ titulo, obligatorio, documento }: TarjetaEstadoProps) {
  const cargado = documento !== null;
  const borde = cargado ? "border-exito" : obligatorio ? "border-alerta" : "border-transparent";
  const tono: StatusTone = cargado ? "exito" : obligatorio ? "alerta" : "neutro";
  const etiqueta = cargado ? "Cargado" : obligatorio ? "Obligatorio" : "Opcional";

  return (
    <Card className={`flex flex-col gap-2 border-2 ${borde}`}>
      <div className="flex items-center gap-3">
        <IconDocument aria-hidden="true" className="shrink-0 text-marca" />
        <p className="font-bold text-tinta">{titulo}</p>
      </div>
      <Pill tone={tono}>{etiqueta}</Pill>
      {cargado && documento ? (
        <p className="text-sm text-tinta-suave">Cargado el {formatCaracasDateTime24(documento.uploadedAt)}</p>
      ) : null}
    </Card>
  );
}
