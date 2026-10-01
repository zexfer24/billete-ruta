/**
 * Lleva a la vista lo que falta corregir en un paso del asistente y le da el
 * foco, sin que el navegador vuelva a desplazar la página por su cuenta.
 *
 * `focus()` solo no basta: si el elemento ya está dentro de la ventana, el
 * navegador no mueve nada aunque lo tape la barra fija de abajo. Con el
 * relleno de desplazamiento de `globals.css` (activado por
 * `data-acciones-fijas`), `scrollIntoView` centra el bloque en la zona que
 * sí se ve. Si el bloque es más alto que esa zona, se alinea por arriba para
 * que se lea su comienzo. Se llama después del render en que aparece el
 * aviso de error, para que el aviso también quede a la vista.
 */
export function revealAndFocus(block: HTMLElement | null, focusTarget: HTMLElement | null): void {
  if (block) {
    let reduceMotion = false;
    try {
      reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      // Sin matchMedia se desplaza sin animación.
      reduceMotion = true;
    }
    const alto = block.getBoundingClientRect().height;
    const cabe = alto <= window.innerHeight * 0.55;
    block.scrollIntoView({ block: cabe ? "center" : "start", behavior: reduceMotion ? "auto" : "smooth" });
  }
  focusTarget?.focus({ preventScroll: true });
}
