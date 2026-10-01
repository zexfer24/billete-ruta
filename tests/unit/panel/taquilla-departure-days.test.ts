import { describe, expect, it } from "vitest";
import { dayChipLabel, dayChipShortLabel, dayLabel, groupByDay, routeNameAddsInfo } from "@/app/panel/taquilla/departure-days";

// 2026-09-30 es miércoles. 16:00 UTC = 12:00 en Caracas (UTC−4).
const now = new Date("2026-09-30T16:00:00Z");

describe("dayLabel y dayChipLabel", () => {
  it("dicen Hoy y Mañana según el día de Caracas, no el de UTC", () => {
    expect(dayLabel(new Date("2026-09-30T23:30:00Z"), now)).toBe("Hoy, miércoles 30 de septiembre");
    // 01:30 UTC del 1 de octubre sigue siendo el 30 en Caracas.
    expect(dayChipLabel(new Date("2026-10-01T01:30:00Z"), now)).toBe("Hoy");
    expect(dayLabel(new Date("2026-10-01T15:00:00Z"), now)).toBe("Mañana, jueves 1 de octubre");
    expect(dayChipLabel(new Date("2026-10-01T15:00:00Z"), now)).toBe("Mañana");
  });

  it("los demás días llevan la fecha, con los nombres escritos en español", () => {
    expect(dayLabel(new Date("2026-10-02T15:00:00Z"), now)).toBe("Viernes 2 de octubre");
    expect(dayChipLabel(new Date("2026-10-02T15:00:00Z"), now)).toBe("Vie 2 oct");
    expect(dayChipLabel(new Date("2026-10-04T15:00:00Z"), now)).toBe("Dom 4 oct");
  });

  it("la ficha corta del teléfono deja Hoy y Mañana y quita el mes a los demás días", () => {
    expect(dayChipShortLabel(new Date("2026-10-01T01:30:00Z"), now)).toBe("Hoy");
    expect(dayChipShortLabel(new Date("2026-10-01T15:00:00Z"), now)).toBe("Mañana");
    expect(dayChipShortLabel(new Date("2026-10-03T15:00:00Z"), now)).toBe("Sáb 3");
  });
});

describe("groupByDay", () => {
  it("agrupa por día de Caracas en el orden recibido", () => {
    const grupos = groupByDay(
      [
        { id: "a", departsAtIso: "2026-09-30T20:00:00Z" },
        { id: "b", departsAtIso: "2026-10-01T02:00:00Z" },
        { id: "c", departsAtIso: "2026-10-01T15:00:00Z" },
      ],
      now,
    );
    expect(grupos.map((g) => [g.key, g.chipLabel, g.items.map((i) => i.id)])).toEqual([
      ["2026-09-30", "Hoy", ["a", "b"]],
      ["2026-10-01", "Mañana", ["c"]],
    ]);
  });
});

describe("routeNameAddsInfo", () => {
  it("no repite el nombre de la ruta cuando solo dice origen y destino", () => {
    expect(routeNameAddsInfo({ routeName: "Caracas – San Cristóbal", origin: "Caracas", destination: "San Cristóbal" })).toBe(false);
    expect(routeNameAddsInfo({ routeName: "caracas - san cristobal", origin: "Caracas", destination: "San Cristóbal" })).toBe(false);
    expect(routeNameAddsInfo({ routeName: "Caracas → Mérida por los Llanos", origin: "Caracas", destination: "Mérida" })).toBe(true);
  });
});
