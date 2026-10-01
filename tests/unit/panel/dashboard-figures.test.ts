import { describe, expect, it } from "vitest";
import { isOverdue } from "@/app/panel/_dashboard/attention";
import { departuresDetail } from "@/app/panel/_dashboard/text";
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
    expect(departuresDetail({ ...base, programadas: 1 }, 1)).toBe("1 atrasada");
    expect(departuresDetail({ programadas: 3, embarcando: 1, enRuta: 2, finalizadas: 1 }, 0)).toBe(
      "3 por salir, 1 embarcando, 2 en ruta y 1 finalizada",
    );
  });

  it("no cuenta más atrasadas que programadas", () => {
    expect(departuresDetail({ ...base, programadas: 1 }, 5)).toBe("1 atrasada");
  });

  it("en otros periodos dice solo cuántas hay en cada estado", () => {
    expect(departuresDetail(base, null)).toBe("8 programadas");
  });

  it("sin salidas lo dice en una frase", () => {
    expect(departuresDetail({ programadas: 0, embarcando: 0, enRuta: 0, finalizadas: 0 }, 0)).toBe(
      "No hay salidas en este periodo",
    );
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
