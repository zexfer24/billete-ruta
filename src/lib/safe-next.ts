/**
 * Valida una ruta de retorno ("next") tras iniciar sesión o registrarse: debe
 * ser una ruta interna, es decir empezar por una sola barra y no contener una
 * barra invertida (que algunos navegadores tratan como separador de host).
 * Cualquier otro valor —vacío, ausente, protocolo relativo ("//") o URL
 * absoluta— se rechaza devolviendo `null`.
 */
export function safeNext(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.includes("\\")) return null;
  return value;
}
