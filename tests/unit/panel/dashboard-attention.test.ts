import { describe, expect, it } from "vitest";
import {
  departsInText,
  departuresNeedingAttention,
  sortTodayDepartures,
} from "@/app/panel/_dashboard/attention";
import { countLabel, joinPhrases } from "@/app/panel/_dashboard/text";

const NOW = new Date("2026-09-30T14:00:00Z");

function salida(id: string, minutos: number, status: string) {
  return { id, departsAt: new Date(NOW.getTime() + minutos * 60_000), status };
}

describe("departuresNeedingAttention", () => {
  it("incluye las programadas dentro de la ventana y deja fuera las lejanas", () => {
    const resultado = departuresNeedingAttention(
      [salida("a", 30, "PROGRAMADA"), salida("b", 120, "PROGRAMADA"), salida("c", 121, "PROGRAMADA")],
      NOW,
    );
    expect(resultado.map((r) => [r.departure.id, r.kind])).toEqual([
      ["a", "pronto"],
      ["b", "pronto"],
    ]);
  });

  it("marca como atrasada una programada cuya hora ya pasó", () => {
    const resultado = departuresNeedingAttention([salida("a", -10, "PROGRAMADA")], NOW);
    expect(resultado).toEqual([{ departure: expect.objectContaining({ id: "a" }), kind: "atrasada" }]);
  });

  it("siempre incluye las que están embarcando, aunque salgan más tarde", () => {
    const resultado = departuresNeedingAttention([salida("a", 300, "MANIFIESTO_CERRADO")], NOW);
    expect(resultado.map((r) => r.kind)).toEqual(["embarcando"]);
  });

  it("ignora las salidas en ruta, finalizadas y canceladas", () => {
    const resultado = departuresNeedingAttention(
      [salida("a", -30, "EN_RUTA"), salida("b", -90, "FINALIZADA"), salida("c", 10, "CANCELADA")],
      NOW,
    );
    expect(resultado).toEqual([]);
  });

  it("ordena atrasadas, embarcando y pronto; a igual tipo, por hora", () => {
    const resultado = departuresNeedingAttention(
      [
        salida("pronto-2", 90, "PROGRAMADA"),
        salida("embarcando", 20, "MANIFIESTO_CERRADO"),
        salida("pronto-1", 15, "PROGRAMADA"),
        salida("atrasada", -5, "PROGRAMADA"),
      ],
      NOW,
    );
    expect(resultado.map((r) => r.departure.id)).toEqual(["atrasada", "embarcando", "pronto-1", "pronto-2"]);
  });

  it("respeta una ventana distinta", () => {
    const resultado = departuresNeedingAttention([salida("a", 45, "PROGRAMADA")], NOW, 30);
    expect(resultado).toEqual([]);
  });
});

describe("sortTodayDepartures", () => {
  it("pone primero las activas y al final las cerradas, cada grupo por hora", () => {
    const orden = sortTodayDepartures([
      salida("fin", -300, "FINALIZADA"),
      salida("tarde", 200, "PROGRAMADA"),
      salida("ruta", -60, "EN_RUTA"),
      salida("cancelada", 100, "CANCELADA"),
    ]).map((s) => s.id);
    expect(orden).toEqual(["ruta", "tarde", "fin", "cancelada"]);
  });

  it("no modifica la lista original", () => {
    const lista = [salida("b", 20, "PROGRAMADA"), salida("a", 10, "PROGRAMADA")];
    sortTodayDepartures(lista);
    expect(lista.map((s) => s.id)).toEqual(["b", "a"]);
  });
});

describe("countLabel", () => {
  it("usa el singular solo con uno", () => {
    expect(countLabel(1, "reserva", "reservas")).toBe("1 reserva");
    expect(countLabel(0, "reserva", "reservas")).toBe("0 reservas");
    expect(countLabel(3, "comprobante", "comprobantes")).toBe("3 comprobantes");
  });

  it("separa los miles con punto", () => {
    expect(countLabel(1250, "reserva", "reservas")).toBe("1.250 reservas");
  });
});

describe("joinPhrases", () => {
  it("une con coma y la última con «y», descartando las vacías", () => {
    expect(joinPhrases([])).toBe("");
    expect(joinPhrases(["2 programadas"])).toBe("2 programadas");
    expect(joinPhrases(["2 programadas", null, "1 en ruta"])).toBe("2 programadas y 1 en ruta");
    expect(joinPhrases(["a", "b", false, "c"])).toBe("a, b y c");
  });
});

describe("departsInText", () => {
  const en = (minutos: number) => new Date(NOW.getTime() + minutos * 60_000);

  it("por debajo de una hora usa el texto relativo de siempre", () => {
    expect(departsInText(en(0), NOW)).toBe("Sale ahora");
    expect(departsInText(en(44), NOW)).toBe("Sale en 44 min");
  });

  it("desde una hora dice el plazo, sin repetir la hora del título", () => {
    expect(departsInText(en(60), NOW)).toBe("Sale en 1 h");
    expect(departsInText(en(105), NOW)).toBe("Sale en 1 h 45 min");
    expect(departsInText(en(120), NOW)).toBe("Sale en 2 h");
  });
});
