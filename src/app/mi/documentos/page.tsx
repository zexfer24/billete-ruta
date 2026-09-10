import { listDocuments } from "@/modules/accounts";
import { requirePassenger } from "@/modules/auth";
import { formatCaracasDateTime24 } from "@/lib/time";
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

  const tieneCedula = documentos.some((d) => d.type === "CEDULA");
  const tienePermiso = documentos.some((d) => d.type === "PERMISO_VIAJE");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mis documentos</h1>
        <p className="mt-1 text-[var(--color-texto-suave)]">
          La foto de tu cédula es obligatoria para concretar una reserva. El permiso de viaje
          solo hace falta si en el grupo viaja un menor de edad.
        </p>
      </div>

      {params.error ? (
        <p className="rounded-lg border border-[var(--color-peligro)] bg-[var(--color-superficie)] px-4 py-3 text-sm text-[var(--color-peligro)]">
          {params.error}
        </p>
      ) : null}
      {params.ok ? (
        <p className="rounded-lg border border-[var(--color-exito)] bg-[var(--color-superficie)] px-4 py-3 text-sm text-[var(--color-exito)]">
          Documento cargado correctamente.
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <TarjetaEstado titulo="Foto de cédula" obligatorio cargado={tieneCedula} />
        <TarjetaEstado titulo="Permiso de viaje" obligatorio={false} cargado={tienePermiso} />
      </section>

      <section className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-6">
        <h2 className="font-semibold">Cargar documento</h2>
        <form
          action={subirDocumentoAction}
          encType="multipart/form-data"
          className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">Tipo de documento</span>
            <select
              name="type"
              required
              className="rounded-lg border border-[var(--color-borde)] px-3 py-2"
              defaultValue="CEDULA"
            >
              <option value="CEDULA">Foto de cédula</option>
              <option value="PERMISO_VIAJE">Permiso de viaje</option>
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">Archivo (imagen)</span>
            <input
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="rounded-lg border border-[var(--color-borde)] px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-[var(--color-acento)] px-5 py-2 font-medium text-white"
          >
            Cargar
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-semibold">Documentos cargados</h2>
        {documentos.length === 0 ? (
          <p className="text-sm text-[var(--color-texto-suave)]">
            Todavía no has cargado documentos.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {documentos.map((doc) => (
              <li
                key={doc.id}
                className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4"
              >
                <p className="font-medium">{ETIQUETAS[doc.type] ?? doc.type}</p>
                <p className="tabular text-sm text-[var(--color-texto-suave)]">
                  Cargado el {formatCaracasDateTime24(doc.uploadedAt)}
                </p>
                <p className="mt-1 text-sm">
                  Estado: {doc.verifiedAt ? "Verificado" : "Pendiente de verificación"}
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/archivos/${doc.filePath}`}
                  alt={ETIQUETAS[doc.type] ?? doc.type}
                  className="mt-3 max-h-48 w-full rounded-lg border border-[var(--color-borde)] object-contain"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TarjetaEstado({
  titulo,
  obligatorio,
  cargado,
}: {
  titulo: string;
  obligatorio: boolean;
  cargado: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4">
      <p className="font-medium">{titulo}</p>
      <p className="text-sm text-[var(--color-texto-suave)]">
        {obligatorio ? "Obligatorio" : "Opcional (solo si viaja un menor de edad)"}
      </p>
      <p
        className={`mt-2 text-sm font-medium ${
          cargado ? "text-[var(--color-exito)]" : "text-[var(--color-alerta)]"
        }`}
      >
        {cargado ? "Cargado" : "Falta cargar"}
      </p>
    </div>
  );
}
