import type { DepartureStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { unitStateOf } from "@/modules/reports/fleet-status";
import type { UnitDeparture } from "@/modules/reports/fleet-status";

const HORA = 3_600_000;
const DIA = 24 * HORA;

/** Salida de prueba con valores por defecto razonables. */
function salida(
  overrides: Partial<UnitDeparture> & { id: string; status: DepartureStatus; departsAt: Date },
): UnitDeparture {
  return {
    routeName: "Ruta de prueba",
    origin: "Origen",
    destination: "Destino",
    vehiclePlate: "AA1234",
    driverName: "Chofer de prueba",
    departedAt: null,
    estimatedArrivalAt: null,
    ...overrides,
  };
}

describe("unitStateOf", () => {
  const now = new Date("2026-09-13T12:00:00Z");

  it("en ruta aunque la unidad esté inactiva: un viaje en curso gana", () => {
    const enRuta = salida({ id: "s1", status: "EN_RUTA", departsAt: new Date(now.getTime() - HORA) });

    const resultado = unitStateOf({ active: false, departures: [enRuta] }, now);

    expect(resultado.state).toBe("EN_RUTA");
    expect(resultado.current).toEqual(enRuta);
  });

  it("embarcando cuando la salida más antigua en curso está con el manifiesto cerrado", () => {
    const embarcando = salida({
      id: "s2",
      status: "MANIFIESTO_CERRADO",
      departsAt: new Date(now.getTime() + HORA),
    });

    const resultado = unitStateOf({ active: true, departures: [embarcando] }, now);

    expect(resultado.state).toBe("EMBARCANDO");
    expect(resultado.current).toEqual(embarcando);
  });

  it("EN_RUTA gana a MANIFIESTO_CERRADO cuando hay ambos", () => {
    const enRuta = salida({ id: "s3", status: "EN_RUTA", departsAt: new Date(now.getTime() - HORA) });
    const embarcando = salida({
      id: "s4",
      status: "MANIFIESTO_CERRADO",
      departsAt: new Date(now.getTime() - 2 * HORA),
    });

    const resultado = unitStateOf({ active: true, departures: [embarcando, enRuta] }, now);

    expect(resultado.state).toBe("EN_RUTA");
    expect(resultado.current).toEqual(enRuta);
  });

  it("asignado con próximas salidas: tope de 3, orden ascendente y ventana de 7 días", () => {
    const pasada = salida({
      id: "pasada",
      status: "PROGRAMADA",
      departsAt: new Date(now.getTime() - HORA),
    });
    const enOchoDias = salida({
      id: "ocho-dias",
      status: "PROGRAMADA",
      departsAt: new Date(now.getTime() + 8 * DIA),
    });
    const p1 = salida({ id: "p1", status: "PROGRAMADA", departsAt: new Date(now.getTime() + 3 * DIA) });
    const p2 = salida({ id: "p2", status: "PROGRAMADA", departsAt: new Date(now.getTime() + HORA) });
    const p3 = salida({ id: "p3", status: "PROGRAMADA", departsAt: new Date(now.getTime() + 2 * DIA) });
    const p4 = salida({ id: "p4", status: "PROGRAMADA", departsAt: new Date(now.getTime() + 6 * DIA) });

    const resultado = unitStateOf(
      { active: true, departures: [pasada, enOchoDias, p1, p2, p3, p4] },
      now,
    );

    expect(resultado.state).toBe("ASIGNADO");
    expect(resultado.current).toBeNull();
    expect(resultado.upcoming.map((u) => u.id)).toEqual(["p2", "p3", "p1"]);
  });

  it("disponible: activa, sin viaje en curso y sin próximas salidas", () => {
    const resultado = unitStateOf({ active: true, departures: [] }, now);

    expect(resultado.state).toBe("DISPONIBLE");
    expect(resultado.current).toBeNull();
    expect(resultado.upcoming).toEqual([]);
  });

  it("fuera de servicio: inactiva y sin viaje en curso, aunque tenga próximas salidas", () => {
    const proxima = salida({ id: "p1", status: "PROGRAMADA", departsAt: new Date(now.getTime() + DIA) });

    const resultado = unitStateOf({ active: false, departures: [proxima] }, now);

    expect(resultado.state).toBe("FUERA_DE_SERVICIO");
    expect(resultado.current).toBeNull();
  });

  it("upcoming se calcula también cuando la unidad está en ruta", () => {
    const enRuta = salida({ id: "s5", status: "EN_RUTA", departsAt: new Date(now.getTime() - HORA) });
    const proxima = salida({ id: "p1", status: "PROGRAMADA", departsAt: new Date(now.getTime() + DIA) });

    const resultado = unitStateOf({ active: true, departures: [enRuta, proxima] }, now);

    expect(resultado.state).toBe("EN_RUTA");
    expect(resultado.upcoming.map((u) => u.id)).toEqual(["p1"]);
  });
});
