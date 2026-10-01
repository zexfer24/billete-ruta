/** Etiqueta del buscador de la bandeja, compartida por la página y su silueta. */
export const MESSAGE_SEARCH_LABEL = "Buscar por teléfono, cédula o código de reserva";

/**
 * Ejemplos de búsqueda bajo el campo, compartidos por la página y su silueta.
 * Cada ejemplo va entero en una línea, como en Usuarios.
 */
export function MessageSearchExamples({ id }: { id?: string }) {
  return (
    <p id={id} className="text-sm text-tinta-suave">
      Ejemplos: <span className="tabular whitespace-nowrap">0412 123 4567</span>,{" "}
      <span className="whitespace-nowrap">V12345678</span> o{" "}
      <span className="tabular whitespace-nowrap">TR-0914-1PAX-SA7D</span>.
    </p>
  );
}
