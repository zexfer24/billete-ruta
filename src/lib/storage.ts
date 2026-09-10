import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getEnv } from "./env";

export type UploadKind = "comprobantes" | "documentos" | "tickets";

/** Tamaño máximo aceptado para una imagen subida por el pasajero. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageFormat = "jpeg" | "png" | "webp";

export class InvalidImageError extends Error {
  constructor(message = "El archivo no es una imagen válida") {
    super(message);
    this.name = "InvalidImageError";
  }
}

/**
 * Verifica el tipo real por la firma de bytes. No se confía en la extensión ni
 * en el tipo declarado por el navegador, que se falsifican con facilidad.
 */
export function assertImageBuffer(buffer: Buffer): ImageFormat {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  throw new InvalidImageError();
}

function baseDir(): string {
  return path.resolve(getEnv().UPLOADS_DIR);
}

/** Resuelve una ruta relativa dentro del directorio de subidas y rechaza fugas. */
function resolveInside(relativePath: string): string {
  const base = baseDir();
  const absoluta = path.resolve(base, relativePath);
  const normalizada = path.normalize(absoluta);
  if (normalizada !== base && !normalizada.startsWith(base + path.sep)) {
    throw new Error("Ruta de archivo fuera del directorio permitido");
  }
  return normalizada;
}

/** Guarda un archivo y devuelve su ruta relativa, que es la que se persiste. */
export async function saveUpload(
  kind: UploadKind,
  ownerId: string,
  filename: string,
  data: Buffer,
): Promise<string> {
  const extension = path.extname(filename).toLowerCase() || ".bin";
  const nombre = `${randomUUID()}${extension}`;
  const relativa = path.posix.join(kind, ownerId, nombre);
  const destino = resolveInside(relativa);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, data);
  return relativa;
}

/** Sobrescribe un archivo en una ruta ya conocida, usado al reemitir un ticket. */
export async function saveUploadAt(relativePath: string, data: Buffer): Promise<string> {
  const destino = resolveInside(relativePath);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, data);
  return relativePath;
}

export async function readUpload(relativePath: string): Promise<Buffer> {
  return readFile(resolveInside(relativePath));
}

export function uploadExtensionFor(format: ImageFormat): string {
  return format === "jpeg" ? ".jpg" : `.${format}`;
}
