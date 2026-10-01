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
 *
 * Si todas están en el mismo estado, la frase va sin número ("Todas por
 * salir", "Está en ruta"): la cifra de encima ya lo dice, y "5 · 5 por salir"
 * repetía el número.
 */
export function departuresDetail(
  counts: { programadas: number; embarcando: number; enRuta: number; finalizadas: number },
  overdueToday: number | null,
): string {
  const atrasadas = overdueToday === null ? 0 : Math.min(Math.max(0, overdueToday), counts.programadas);
  const programadas = counts.programadas - atrasadas;
  // Cada estado: cuántas hay, la frase con número y la frase sin número
  // (una sola salida o todas) para cuando es el único estado.
  const estados: { count: number; withCount: string; one: string; all: string }[] = [
    {
      count: atrasadas,
      withCount: countLabel(atrasadas, "atrasada", "atrasadas"),
      one: "Está atrasada",
      all: "Todas atrasadas",
    },
    overdueToday === null
      ? {
          count: programadas,
          withCount: countLabel(programadas, "programada", "programadas"),
          one: "Está programada",
          all: "Todas programadas",
        }
      : {
          count: programadas,
          withCount: countLabel(programadas, "por salir", "por salir"),
          one: "Por salir",
          all: "Todas por salir",
        },
    { count: counts.embarcando, withCount: `${counts.embarcando} embarcando`, one: "Está embarcando", all: "Todas embarcando" },
    { count: counts.enRuta, withCount: `${counts.enRuta} en ruta`, one: "Está en ruta", all: "Todas en ruta" },
    {
      count: counts.finalizadas,
      withCount: countLabel(counts.finalizadas, "finalizada", "finalizadas"),
      one: "Ya finalizó",
      all: "Todas finalizadas",
    },
  ];
  const presentes = estados.filter((estado) => estado.count > 0);
  if (presentes.length === 0) return "No hay salidas en este periodo";
  const [unico] = presentes;
  if (presentes.length === 1 && unico) return unico.count === 1 ? unico.one : unico.all;
  return joinPhrases(presentes.map((estado) => estado.withCount));
}

/**
 * Línea de "Choferes y buses" para los choferes que no se listan porque su
 * viaje de hoy ya está en "Salidas de hoy". Con otros choferes listados
 * encima (`othersListed`), dice "más".
 */
export function todayTripsNote(count: number, othersListed: boolean): string {
  if (othersListed) {
    return count === 1
      ? "1 chofer más tiene su viaje de hoy en «Salidas de hoy»."
      : `${countLabel(count, "chofer", "choferes")} más tienen su viaje de hoy en «Salidas de hoy».`;
  }
  return count === 1
    ? "El chofer tiene su viaje de hoy en «Salidas de hoy»."
    : `Los ${countLabel(count, "chofer", "choferes")} tienen su viaje de hoy en «Salidas de hoy».`;
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
