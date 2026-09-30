/**
 * Enlaces de la pantalla de salidas. Módulo puro: arma la URL con las
 * pestañas (`?ver=historial`), los días visibles de "Próximas"
 * (`?dias=todos`) y el panel de crear (`?crear=1`), para que abrir y cerrar
 * el panel no cambie lo que se estaba viendo.
 */
export function proximasHref({
  historial = false,
  todosLosDias = false,
  crear = false,
}: {
  historial?: boolean;
  todosLosDias?: boolean;
  crear?: boolean;
}): string {
  const query = new URLSearchParams();
  if (historial) query.set("ver", "historial");
  else if (todosLosDias) query.set("dias", "todos");
  if (crear) query.set("crear", "1");
  const texto = query.toString();
  return texto ? `/panel/salidas?${texto}` : "/panel/salidas";
}
