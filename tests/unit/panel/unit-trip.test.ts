import { describe, expect, it } from "vitest";
import { describeUnitTrip } from "@/app/panel/_shared/unit-trip";
import type { UnitDeparture } from "@/modules/reports";

const NOW = new Date("2026-09-13T14:00:00Z");

function unidad(overrides: Partial<UnitDeparture> = {}): UnitDeparture {
  return {
    id: "dep-1",
    status: "PROGRAMADA",
    departsAt: new Date("2026-09-13T15:00:00Z"),
    routeName: "Caracas - Maracaibo",
    origin: "Caracas",
    destination: "Maracaibo",
    vehiclePlate: "AB123CD",
    driverName: "Juan Pérez",
    departedAt: null,
    estimatedArrivalAt: null,
    ...overrides,
  };
}

describe("describeUnitTrip", () => {
  it("en ruta, con llegada estimada", () => {
    const current = unidad({
      status: "EN_RUTA",
      departedAt: new Date("2026-09-13T13:00:00Z"),
      estimatedArrivalAt: new Date("2026-09-13T17:00:00Z"),
    });
    expect(describeUnitTrip({ current, upcoming: [] }, NOW)).toEqual({
      title: "Caracas - Maracaibo",
      detail: "Salió 09:00 · llegada estimada 13:00",
    });
  });

  it("en ruta, sin llegada estimada", () => {
    const current = unidad({
      status: "EN_RUTA",
      departedAt: new Date("2026-09-13T13:00:00Z"),
      estimatedArrivalAt: null,
    });
    expect(describeUnitTrip({ current, upcoming: [] }, NOW)).toEqual({
      title: "Caracas - Maracaibo",
      detail: "Salió 09:00",
    });
  });

  it("embarcando", () => {
    const current = unidad({
      status: "MANIFIESTO_CERRADO",
      departsAt: new Date("2026-09-13T15:00:00Z"),
    });
    expect(describeUnitTrip({ current, upcoming: [] }, NOW)).toEqual({
      title: "Caracas - Maracaibo",
      detail: "Embarcando · sale 11:00",
    });
  });

  it("sin viaje en curso, con una sola próxima salida", () => {
    const proxima = unidad({ status: "PROGRAMADA", departsAt: new Date("2026-09-14T12:00:00Z") });
    expect(describeUnitTrip({ current: null, upcoming: [proxima] }, NOW)).toEqual({
      title: "Caracas - Maracaibo",
      detail: "14/09 08:00",
    });
  });

  it("sin viaje en curso, con varias próximas salidas", () => {
    const upcoming = [
      unidad({ status: "PROGRAMADA", departsAt: new Date("2026-09-14T12:00:00Z") }),
      unidad({ status: "PROGRAMADA", departsAt: new Date("2026-09-15T12:00:00Z") }),
      unidad({ status: "PROGRAMADA", departsAt: new Date("2026-09-16T12:00:00Z") }),
    ];
    expect(describeUnitTrip({ current: null, upcoming }, NOW)).toEqual({
      title: "Caracas - Maracaibo",
      detail: "14/09 08:00 · +2 más",
    });
  });

  it("sin viaje en curso ni próximas salidas, devuelve null", () => {
    expect(describeUnitTrip({ current: null, upcoming: [] }, NOW)).toBeNull();
  });
});
