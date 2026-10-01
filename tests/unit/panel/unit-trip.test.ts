import { describe, expect, it } from "vitest";
import { activeTripDepartureId, describeUnitTrip } from "@/app/panel/_shared/unit-trip";
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
      title: "Caracas → Maracaibo",
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
      title: "Caracas → Maracaibo",
      detail: "Salió 09:00",
    });
  });

  it("embarcando", () => {
    const current = unidad({
      status: "MANIFIESTO_CERRADO",
      departsAt: new Date("2026-09-13T15:00:00Z"),
    });
    expect(describeUnitTrip({ current, upcoming: [] }, NOW)).toEqual({
      title: "Caracas → Maracaibo",
      detail: "Embarcando · sale 11:00",
    });
  });

  it("en ruta, de otro día: la hora lleva la fecha", () => {
    const current = unidad({
      status: "EN_RUTA",
      departedAt: new Date("2026-09-12T13:00:00Z"),
      estimatedArrivalAt: new Date("2026-09-12T17:00:00Z"),
    });
    expect(describeUnitTrip({ current, upcoming: [] }, NOW)).toEqual({
      title: "Caracas → Maracaibo",
      detail: "Salió 12/09 09:00 · llegada estimada 12/09 13:00",
    });
  });

  it("embarcando, de otro día: la hora lleva la fecha", () => {
    const current = unidad({
      status: "MANIFIESTO_CERRADO",
      departsAt: new Date("2026-09-14T15:00:00Z"),
    });
    expect(describeUnitTrip({ current, upcoming: [] }, NOW)).toEqual({
      title: "Caracas → Maracaibo",
      detail: "Embarcando · sale 14/09 11:00",
    });
  });

  it("sin viaje en curso, con una sola próxima salida", () => {
    const proxima = unidad({ status: "PROGRAMADA", departsAt: new Date("2026-09-14T12:00:00Z") });
    expect(describeUnitTrip({ current: null, upcoming: [proxima] }, NOW)).toEqual({
      title: "Caracas → Maracaibo",
      detail: "Mañana 08:00",
    });
  });

  it("una próxima salida de hoy dice «Hoy» y una lejana lleva el día de la semana y la fecha", () => {
    const hoy = unidad({ status: "PROGRAMADA", departsAt: new Date("2026-09-13T15:00:00Z") });
    expect(describeUnitTrip({ current: null, upcoming: [hoy] }, NOW)?.detail).toBe("Hoy 11:00");
    const lejana = unidad({ status: "PROGRAMADA", departsAt: new Date("2026-09-16T12:00:00Z") });
    expect(describeUnitTrip({ current: null, upcoming: [lejana] }, NOW)?.detail).toBe("Miércoles 16/09 08:00");
  });

  it("sin viaje en curso, con varias próximas salidas", () => {
    const upcoming = [
      unidad({ status: "PROGRAMADA", departsAt: new Date("2026-09-14T12:00:00Z") }),
      unidad({ status: "PROGRAMADA", departsAt: new Date("2026-09-15T12:00:00Z") }),
      unidad({ status: "PROGRAMADA", departsAt: new Date("2026-09-16T12:00:00Z") }),
    ];
    // La lista llega recortada a 3: sin el total aparte no se inventa una cifra.
    expect(describeUnitTrip({ current: null, upcoming }, NOW)).toEqual({
      title: "Caracas → Maracaibo",
      detail: "Mañana 08:00 · y otras salidas en 7 días",
    });
  });

  it("con el total real de los 7 días, da la cifra exacta", () => {
    const upcoming = [
      unidad({ status: "PROGRAMADA", departsAt: new Date("2026-09-14T12:00:00Z") }),
      unidad({ status: "PROGRAMADA", departsAt: new Date("2026-09-15T12:00:00Z") }),
      unidad({ status: "PROGRAMADA", departsAt: new Date("2026-09-16T12:00:00Z") }),
    ];
    expect(describeUnitTrip({ current: null, upcoming, upcomingCount: 15 }, NOW)?.detail).toBe(
      "Mañana 08:00 · 14 salidas más en 7 días",
    );
    expect(describeUnitTrip({ current: null, upcoming: upcoming.slice(0, 2) }, NOW)?.detail).toBe(
      "Mañana 08:00 · 1 salida más en 7 días",
    );
  });

  it("atrasada de hoy: dice a qué hora debía salir, con las palabras del tablero", () => {
    const current = unidad({ departsAt: new Date("2026-09-13T13:00:00Z"), overdue: true });
    expect(describeUnitTrip({ current, upcoming: [] }, NOW)).toEqual({
      title: "Caracas → Maracaibo",
      detail: "Debía salir a las 09:00",
      late: true,
    });
  });

  it("atrasada de ayer: el aviso lleva el día", () => {
    const current = unidad({ departsAt: new Date("2026-09-12T23:00:00Z"), overdue: true });
    expect(describeUnitTrip({ current, upcoming: [] }, NOW)?.detail).toBe("Debía salir ayer a las 19:00");
  });

  it("atrasada con próximas salidas: gana la atrasada y no suma «salidas más»", () => {
    const current = unidad({ id: "dep-0", departsAt: new Date("2026-09-13T13:00:00Z"), overdue: true });
    const upcoming = [
      unidad({ routeName: "Caracas - Mérida", departsAt: new Date("2026-09-13T22:00:00Z") }),
      unidad({ routeName: "Caracas - Mérida", departsAt: new Date("2026-09-14T22:00:00Z") }),
    ];
    expect(describeUnitTrip({ current, upcoming, upcomingCount: 2 }, NOW)).toEqual({
      title: "Caracas → Maracaibo",
      detail: "Debía salir a las 09:00",
      late: true,
    });
  });

  it("embarque abierto cuya hora ya pasó: no dice «sale» con una hora vencida", () => {
    const current = unidad({ status: "MANIFIESTO_CERRADO", departsAt: new Date("2026-09-13T13:00:00Z") });
    expect(describeUnitTrip({ current, upcoming: [] }, NOW)).toEqual({
      title: "Caracas → Maracaibo",
      detail: "Embarque abierto · debía salir a las 09:00",
      late: true,
    });
  });

  it("sin viaje en curso ni próximas salidas, devuelve null", () => {
    expect(describeUnitTrip({ current: null, upcoming: [] }, NOW)).toBeNull();
  });
});

describe("activeTripDepartureId", () => {
  it("da la salida en ruta, embarcando o atrasada, para enlazar a su hoja", () => {
    expect(activeTripDepartureId({ current: unidad({ id: "a", status: "EN_RUTA" }) })).toBe("a");
    expect(activeTripDepartureId({ current: unidad({ id: "b", status: "MANIFIESTO_CERRADO" }) })).toBe("b");
    expect(activeTripDepartureId({ current: unidad({ id: "c", overdue: true }) })).toBe("c");
  });

  it("sin viaje en curso o con solo una próxima salida no hay nada que enlazar", () => {
    expect(activeTripDepartureId({ current: null })).toBeNull();
    expect(activeTripDepartureId({ current: unidad({ id: "d" }) })).toBeNull();
  });
});
