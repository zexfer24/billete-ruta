import { describe, expect, it } from "vitest";
import { isOverdue } from "@/app/panel/_dashboard/attention";
import { departuresDetail, todayTripsNote } from "@/app/panel/_dashboard/text";
import { showsUsdEquivalent } from "@/app/panel/pasajeros/money";

const NOW = new Date("2026-09-30T14:00:00Z");

describe("isOverdue", () => {
  it("marca solo las programadas cuya hora ya pasó", () => {
    expect(isOverdue({ departsAt: new Date("2026-09-30T13:00:00Z"), status: "PROGRAMADA" }, NOW)).toBe(true);
    expect(isOverdue({ departsAt: new Date("2026-09-30T15:00:00Z"), status: "PROGRAMADA" }, NOW)).toBe(false);
    expect(isOverdue({ departsAt: new Date("2026-09-30T13:00:00Z"), status: "EN_RUTA" }, NOW)).toBe(false);
    expect(isOverdue({ departsAt: new Date("2026-09-30T13:00:00Z"), status: "MANIFIESTO_CERRADO" }, NOW)).toBe(false);
  });
});

describe("departuresDetail", () => {
  const base = { programadas: 8, embarcando: 0, enRuta: 0, finalizadas: 0 };

  it("en el periodo de hoy separa las atrasadas de las que faltan por salir", () => {
    expect(departuresDetail(base, 2)).toBe("2 atrasadas y 6 por salir");
    expect(departuresDetail({ programadas: 3, embarcando: 1, enRuta: 2, finalizadas: 1 }, 0)).toBe(
      "3 por salir, 1 embarcando, 2 en ruta y 1 finalizada",
    );
  });

  it("con todas en el mismo estado no repite el número de la cifra", () => {
    expect(departuresDetail({ ...base, programadas: 5 }, 0)).toBe("Todas por salir");
    expect(departuresDetail({ ...base, programadas: 1 }, 0)).toBe("Por salir");
    expect(departuresDetail({ ...base, programadas: 1 }, 1)).toBe("Está atrasada");
    expect(departuresDetail(base, 8)).toBe("Todas atrasadas");
    expect(departuresDetail({ programadas: 0, embarcando: 0, enRuta: 0, finalizadas: 4 }, 0)).toBe(
      "Todas finalizadas",
    );
    expect(departuresDetail({ programadas: 0, embarcando: 0, enRuta: 1, finalizadas: 0 }, null)).toBe(
      "Está en ruta",
    );
  });

  it("no cuenta más atrasadas que programadas", () => {
    expect(departuresDetail({ ...base, programadas: 1 }, 5)).toBe("Está atrasada");
    expect(departuresDetail({ ...base, programadas: 2, finalizadas: 1 }, 5)).toBe("2 atrasadas y 1 finalizada");
  });

  it("en otros periodos dice solo cuántas hay en cada estado", () => {
    expect(departuresDetail(base, null)).toBe("Todas programadas");
    expect(departuresDetail({ ...base, finalizadas: 2 }, null)).toBe("8 programadas y 2 finalizadas");
  });

  it("sin salidas lo dice en una frase", () => {
    expect(departuresDetail({ programadas: 0, embarcando: 0, enRuta: 0, finalizadas: 0 }, 0)).toBe(
      "No hay salidas en este periodo",
    );
  });
});

describe("todayTripsNote", () => {
  it("cuenta a los choferes que ya salen en «Salidas de hoy», en singular o plural", () => {
    expect(todayTripsNote(5, false)).toBe("Los 5 choferes tienen su viaje de hoy en «Salidas de hoy».");
    expect(todayTripsNote(1, false)).toBe("El chofer tiene su viaje de hoy en «Salidas de hoy».");
    expect(todayTripsNote(3, true)).toBe("3 choferes más tienen su viaje de hoy en «Salidas de hoy».");
    expect(todayTripsNote(1, true)).toBe("1 chofer más tiene su viaje de hoy en «Salidas de hoy».");
  });
});

describe("showsUsdEquivalent", () => {
  it("omite el equivalente en USD y en USDT, que van 1:1", () => {
    expect(showsUsdEquivalent("USD")).toBe(false);
    expect(showsUsdEquivalent("USDT")).toBe(false);
    expect(showsUsdEquivalent("VES")).toBe(true);
    expect(showsUsdEquivalent("COP")).toBe(true);
  });
});
