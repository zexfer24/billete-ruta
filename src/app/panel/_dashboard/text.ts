/**
 * Textos con número del panel de agencia. Módulo puro (sin React ni Next),
 * compartido por el tablero, "Pasajeros y pagos" y la taquilla, para escribir
 * siempre el singular o el plural correcto según la cantidad (spec, sección 1:
 * nada de "reserva(s)").
 */

/**
 * La cantidad seguida de la palabra en singular o en plural: `1 reserva`,
 * `3 reservas`, `0 reservas`. El número usa punto de miles, como el resto del
 * panel (`1.250 reservas`).
 */
export function countLabel(count: number, singular: string, plural: string): string {
  const numero = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 0 }).format(count);
  return `${numero} ${count === 1 ? singular : plural}`;
}

/**
 * Une frases cortas en una enumeración natural: `a`, `a y b`, `a, b y c`.
 * Descarta las vacías; sin ninguna devuelve una cadena vacía.
 */
export function joinPhrases(parts: ReadonlyArray<string | null | undefined | false>): string {
  const frases = parts.filter((p): p is string => typeof p === "string" && p.length > 0);
  if (frases.length <= 1) return frases[0] ?? "";
  return `${frases.slice(0, -1).join(", ")} y ${frases[frases.length - 1]}`;
}

/**
 * Frase de la cifra "Salidas". Con `overdueToday` (solo en el periodo "hoy",
 * donde el conteo coincide con las salidas del día), las programadas se
 * separan en atrasadas y por salir, igual que avisa "Lo que necesita tu
 * atención": así la cifra no repite su número ("8 · 8 programadas") ni
 * contradice el aviso. En los otros periodos, las programadas de días pasados
 * no se pueden separar así, y se dice solo cuántas hay en cada estado.
 */
export function departuresDetail(
  counts: { programadas: number; embarcando: number; enRuta: number; finalizadas: number },
  overdueToday: number | null,
): string {
  const atrasadas = overdueToday === null ? 0 : Math.min(Math.max(0, overdueToday), counts.programadas);
  const programadas = counts.programadas - atrasadas;
  return (
    joinPhrases([
      atrasadas > 0 && countLabel(atrasadas, "atrasada", "atrasadas"),
      programadas > 0 &&
        (overdueToday === null
          ? countLabel(programadas, "programada", "programadas")
          : countLabel(programadas, "por salir", "por salir")),
      counts.embarcando > 0 && `${counts.embarcando} embarcando`,
      counts.enRuta > 0 && `${counts.enRuta} en ruta`,
      counts.finalizadas > 0 && countLabel(counts.finalizadas, "finalizada", "finalizadas"),
    ]) || "No hay salidas en este periodo"
  );
}

/**
 * Frase en vivo de las reservas por cobrar, en "Lo que necesita tu atención".
 * Cuenta reservas cuya salida aún no parte y que todavía deben dinero (sin
 * pago, con un pago en revisión, abonadas o por pagar en la taquilla). La
 * parte que paga en la taquilla es un subconjunto exacto de la cifra. Empieza
 * por "Ahora mismo" porque no depende del periodo del resumen.
 */
export function porCobrarNowText(total: number, payOnSite: number): string {
  if (total === 0) return "Ahora mismo ninguna reserva debe dinero.";
  const base = `Ahora mismo, ${countLabel(total, "reserva debe", "reservas deben")} dinero y su salida aún no parte.`;
  if (payOnSite === 0) return base;
  if (payOnSite === total) {
    return `${base} ${total === 1 ? "Paga" : "Todas pagan"} en la taquilla.`;
  }
  return `${base} De ellas, ${countLabel(payOnSite, "paga", "pagan")} en la taquilla.`;
}
