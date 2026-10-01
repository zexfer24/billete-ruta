/**
 * Ejemplos de búsqueda bajo el campo, compartidos por la página y su silueta.
 * Cada ejemplo va entero en una línea: un teléfono partido a la mitad
 * ("0412 123" / "4567") ya no parece un teléfono.
 */
export function SearchExamples({ id }: { id?: string }) {
  return (
    <p id={id} className="text-sm text-tinta-suave">
      Ejemplos: <span className="whitespace-nowrap">V12345678</span>,{" "}
      <span className="whitespace-nowrap">María Pérez</span> o{" "}
      <span className="tabular whitespace-nowrap">0412 123 4567</span>.
    </p>
  );
}
