import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const SIGNATURE_LENGTH = 16;

function toBase32(buffer: Buffer, length: number): string {
  let bits = 0;
  let valor = 0;
  let salida = "";
  for (const byte of buffer) {
    valor = (valor << 8) | byte;
    bits += 8;
    while (bits >= 5 && salida.length < length) {
      salida += BASE32[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
    if (salida.length >= length) break;
  }
  return salida;
}

function signature(code: string): string {
  const mac = createHmac("sha256", getEnv().TICKET_SECRET).update(code).digest();
  return toBase32(mac, SIGNATURE_LENGTH);
}

/** Contenido del código QR: el serial más una firma que impide falsificarlo. */
export function signTicketCode(code: string): string {
  return `${code}.${signature(code)}`;
}

/**
 * Verifica un QR sin tocar la base de datos. Un código con firma inválida se
 * rechaza en el acto, antes de cualquier consulta.
 */
export function verifyTicketQr(payload: string): { valid: boolean; code: string | null } {
  const partes = payload.split(".");
  if (partes.length !== 2) return { valid: false, code: null };
  const [code, firma] = partes;
  if (!code || !firma || firma.length !== SIGNATURE_LENGTH) {
    return { valid: false, code: null };
  }
  const esperada = Buffer.from(signature(code));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length) return { valid: false, code: null };
  return timingSafeEqual(esperada, recibida) ? { valid: true, code } : { valid: false, code: null };
}
